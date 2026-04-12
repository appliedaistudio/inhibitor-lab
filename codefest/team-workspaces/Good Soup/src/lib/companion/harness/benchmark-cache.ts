import { execFile } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import type {
  BenchmarkAccess,
  BenchmarkDefinition,
  BenchmarkId,
  BenchmarkSourceKind
} from "./benchmarks";
import { getAllBenchmarkDefinitions, getBenchmarkDefinition } from "./benchmarks";
import { firstEnv } from "../config";

const execFileAsync = promisify(execFile);
const DEFAULT_CACHE_ROOT = path.join(process.cwd(), "data", "benchmarks", "cache");
const BENCHMARK_CACHE_SCHEMA_VERSION = 1;

export type BenchmarkCacheStatus = "cached" | "auth_required" | "error";

export interface BenchmarkCacheEntry {
  benchmark_id: BenchmarkId;
  source_kind: BenchmarkSourceKind;
  access: BenchmarkAccess;
  status: BenchmarkCacheStatus;
  cache_dir: string;
  source_ref: string;
  asset_paths: string[];
  message?: string;
  revision?: string;
  updated_at: string;
}

export interface BenchmarkCacheManifest {
  schema_version: number;
  generated_at: string;
  entries: BenchmarkCacheEntry[];
}

export interface CloneRepoResult {
  revision: string;
  target_dir: string;
}

export interface CloneRepoOptions {
  repoUrl: string;
  revision?: string;
  targetDir: string;
}

export interface SyncBenchmarkCacheOptions {
  benchmarkIds?: BenchmarkId[];
  cacheRoot?: string;
  fetchImpl?: typeof fetch;
  hfToken?: string;
  force?: boolean;
  cloneRepoImpl?: (options: CloneRepoOptions) => Promise<CloneRepoResult>;
}

class BenchmarkAuthRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BenchmarkAuthRequiredError";
  }
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function loadManifest(cacheRoot: string): Promise<BenchmarkCacheManifest> {
  const manifestPath = path.join(cacheRoot, "manifest.json");
  if (!(await pathExists(manifestPath))) {
    return {
      schema_version: BENCHMARK_CACHE_SCHEMA_VERSION,
      generated_at: new Date(0).toISOString(),
      entries: []
    };
  }

  const content = await readFile(manifestPath, "utf8");
  const parsed = JSON.parse(content) as Partial<BenchmarkCacheManifest>;
  return {
    schema_version:
      typeof parsed.schema_version === "number"
        ? parsed.schema_version
        : BENCHMARK_CACHE_SCHEMA_VERSION,
    generated_at:
      typeof parsed.generated_at === "string"
        ? parsed.generated_at
        : new Date(0).toISOString(),
    entries: Array.isArray(parsed.entries)
      ? parsed.entries.map((entry) => normalizeManifestEntry(cacheRoot, entry))
      : []
  };
}

async function saveManifest(cacheRoot: string, manifest: BenchmarkCacheManifest): Promise<void> {
  await mkdir(cacheRoot, { recursive: true });
  const manifestPath = path.join(cacheRoot, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

function requiresHfToken(definition: BenchmarkDefinition): boolean {
  return definition.source_kind === "hf_dataset" && definition.access !== "public";
}

function getCacheDir(cacheRoot: string, definition: BenchmarkDefinition): string {
  return path.join(cacheRoot, definition.cache_subdir);
}

function toPortableCachePath(cacheRoot: string, targetPath: string): string {
  return path.relative(cacheRoot, targetPath).split(path.sep).join("/");
}

function normalizeManifestEntry(
  cacheRoot: string,
  entry: BenchmarkCacheEntry
): BenchmarkCacheEntry {
  const normalizePath = (targetPath: string) =>
    path.isAbsolute(targetPath) ? toPortableCachePath(cacheRoot, targetPath) : targetPath;
  const normalizeSourceRef = (sourceRef: string) => {
    if (!path.isAbsolute(sourceRef)) {
      return sourceRef;
    }

    return path.relative(process.cwd(), sourceRef).split(path.sep).join("/");
  };

  return {
    ...entry,
    cache_dir: normalizePath(entry.cache_dir),
    source_ref: normalizeSourceRef(entry.source_ref),
    asset_paths: entry.asset_paths.map(normalizePath)
  };
}

function buildCachedEntry(
  definition: BenchmarkDefinition,
  cacheRoot: string,
  cacheDir: string,
  overrides: Partial<BenchmarkCacheEntry> = {}
): BenchmarkCacheEntry {
  return {
    benchmark_id: definition.id,
    source_kind: definition.source_kind,
    access: definition.access,
    status: "cached",
    cache_dir: toPortableCachePath(cacheRoot, cacheDir),
    source_ref:
      overrides.source_ref ??
      definition.repo_url ??
      definition.local_source_path ??
      definition.assets?.map((asset) => asset.url).join(",") ??
      definition.id,
    asset_paths: (overrides.asset_paths ?? []).map((assetPath) =>
      path.isAbsolute(assetPath) ? toPortableCachePath(cacheRoot, assetPath) : assetPath
    ),
    message: overrides.message,
    revision: overrides.revision,
    updated_at: new Date().toISOString()
  };
}

function buildAuthRequiredEntry(
  definition: BenchmarkDefinition,
  cacheRoot: string,
  cacheDir: string
): BenchmarkCacheEntry {
  return {
    benchmark_id: definition.id,
    source_kind: definition.source_kind,
    access: definition.access,
    status: "auth_required",
    cache_dir: toPortableCachePath(cacheRoot, cacheDir),
    source_ref: definition.assets?.map((asset) => asset.url).join(",") ?? definition.id,
    asset_paths: [],
    message: "Benchmark requires Hugging Face auth before caching.",
    updated_at: new Date().toISOString()
  };
}

async function downloadDefinitionAssets(
  definition: BenchmarkDefinition,
  cacheRoot: string,
  cacheDir: string,
  fetchImpl: typeof fetch,
  hfToken?: string
): Promise<BenchmarkCacheEntry> {
  const assetPaths: string[] = [];
  const assets = definition.assets ?? [];

  for (const asset of assets) {
    const targetPath = path.join(cacheDir, asset.relative_path);
    await mkdir(path.dirname(targetPath), { recursive: true });

    const headers =
      asset.auth_strategy === "hf_bearer" && hfToken
        ? { Authorization: `Bearer ${hfToken}` }
        : undefined;
    const response = await fetchImpl(asset.url, { headers });
    if (!response.ok) {
      if (asset.auth_strategy === "hf_bearer" && (response.status === 401 || response.status === 403)) {
        throw new BenchmarkAuthRequiredError(
          `Benchmark requires approved Hugging Face access before caching (${response.status}).`
        );
      }

      throw new Error(`Failed to download ${definition.id}:${asset.id} (${response.status})`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(targetPath, buffer);
    assetPaths.push(targetPath);
  }

  return buildCachedEntry(definition, cacheRoot, cacheDir, { asset_paths: assetPaths });
}

async function defaultCloneRepoImpl(options: CloneRepoOptions): Promise<CloneRepoResult> {
  const { repoUrl, revision, targetDir } = options;
  await mkdir(path.dirname(targetDir), { recursive: true });

  if (!(await pathExists(targetDir))) {
    await execFileAsync("git", ["clone", "--depth", "1", repoUrl, targetDir]);
  }

  if (revision && revision !== "main") {
    await execFileAsync("git", ["-C", targetDir, "checkout", revision]);
  }

  const { stdout } = await execFileAsync("git", ["-C", targetDir, "rev-parse", "HEAD"]);
  return {
    revision: stdout.trim(),
    target_dir: targetDir
  };
}

async function cacheDefinition(
  definition: BenchmarkDefinition,
  cacheRoot: string,
  previousEntry: BenchmarkCacheEntry | undefined,
  options: SyncBenchmarkCacheOptions
): Promise<BenchmarkCacheEntry> {
  const cacheDir = getCacheDir(cacheRoot, definition);

  if (definition.source_kind === "local_custom") {
    return buildCachedEntry(definition, cacheRoot, cacheDir, {
      source_ref: definition.local_source_path ?? definition.id,
      asset_paths: definition.local_source_path
        ? [definition.local_source_path]
        : []
    });
  }

  if (!options.force && previousEntry?.status === "cached") {
    return {
      ...previousEntry,
      updated_at: new Date().toISOString()
    };
  }

  if (requiresHfToken(definition) && !options.hfToken) {
    return buildAuthRequiredEntry(definition, cacheRoot, cacheDir);
  }

  if (definition.source_kind === "github_repo") {
    const cloneRepo = options.cloneRepoImpl ?? defaultCloneRepoImpl;
    const cloneResult = await cloneRepo({
      repoUrl: definition.repo_url ?? "",
      revision: definition.repo_revision,
      targetDir: cacheDir
    });

    return buildCachedEntry(definition, cacheRoot, cacheDir, {
      source_ref: definition.repo_url ?? definition.id,
      asset_paths: [cloneResult.target_dir],
      revision: cloneResult.revision
    });
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  return downloadDefinitionAssets(definition, cacheRoot, cacheDir, fetchImpl, options.hfToken);
}

export async function syncBenchmarkCache(
  options: SyncBenchmarkCacheOptions = {}
): Promise<BenchmarkCacheManifest> {
  const cacheRoot = options.cacheRoot ?? DEFAULT_CACHE_ROOT;
  await mkdir(cacheRoot, { recursive: true });

  const requestedDefinitions = (options.benchmarkIds ?? getAllBenchmarkDefinitions().map((item) => item.id)).map(
    (benchmarkId) => getBenchmarkDefinition(benchmarkId)
  );

  const previousManifest = await loadManifest(cacheRoot);
  const previousEntries = new Map(
    previousManifest.entries.map((entry) => [entry.benchmark_id, entry])
  );

  const nextEntries = [...previousManifest.entries];

  for (const definition of requestedDefinitions) {
    try {
      const entry = await cacheDefinition(
        definition,
        cacheRoot,
        previousEntries.get(definition.id),
        options
      );
      const existingIndex = nextEntries.findIndex((item) => item.benchmark_id === definition.id);
      if (existingIndex >= 0) {
        nextEntries.splice(existingIndex, 1, entry);
      } else {
        nextEntries.push(entry);
      }
    } catch (error) {
      if (error instanceof BenchmarkAuthRequiredError) {
        const authRequired: BenchmarkCacheEntry = {
          benchmark_id: definition.id,
          source_kind: definition.source_kind,
          access: definition.access,
          status: "auth_required",
          cache_dir: toPortableCachePath(cacheRoot, getCacheDir(cacheRoot, definition)),
          source_ref:
            definition.repo_url ??
            definition.local_source_path ??
            definition.assets?.map((asset) => asset.url).join(",") ??
            definition.id,
          asset_paths: [],
          message: error.message,
          updated_at: new Date().toISOString()
        };

        const existingIndex = nextEntries.findIndex((item) => item.benchmark_id === definition.id);
        if (existingIndex >= 0) {
          nextEntries.splice(existingIndex, 1, authRequired);
        } else {
          nextEntries.push(authRequired);
        }
        continue;
      }

      const failure: BenchmarkCacheEntry = {
        benchmark_id: definition.id,
        source_kind: definition.source_kind,
        access: definition.access,
        status: "error",
        cache_dir: toPortableCachePath(cacheRoot, getCacheDir(cacheRoot, definition)),
        source_ref:
          definition.repo_url ??
          definition.local_source_path ??
          definition.assets?.map((asset) => asset.url).join(",") ??
          definition.id,
        asset_paths: [],
        message: error instanceof Error ? error.message : "Unknown benchmark sync error",
        updated_at: new Date().toISOString()
      };

      const existingIndex = nextEntries.findIndex((item) => item.benchmark_id === definition.id);
      if (existingIndex >= 0) {
        nextEntries.splice(existingIndex, 1, failure);
      } else {
        nextEntries.push(failure);
      }
    }
  }

  const manifest: BenchmarkCacheManifest = {
    schema_version: BENCHMARK_CACHE_SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    entries: nextEntries.sort((left, right) => left.benchmark_id.localeCompare(right.benchmark_id))
  };

  await saveManifest(cacheRoot, manifest);
  return manifest;
}

export function getDefaultBenchmarkCacheRoot(): string {
  return DEFAULT_CACHE_ROOT;
}

export function getDefaultHfToken(): string | undefined {
  return firstEnv(["HF_TOKEN", "HUGGINGFACE_HUB_TOKEN", "HUGGING_FACE_HUB_TOKEN"]);
}

export function createBenchmarkRunId(): string {
  return `${os.hostname()}-${Date.now()}`;
}
