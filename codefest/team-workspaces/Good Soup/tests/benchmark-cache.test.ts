import { mkdtemp, mkdir, rm, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getAllBenchmarkDefinitions,
  getBenchmarkDefinition,
  getBenchmarkRegistryForTrack
} from "../src/lib/companion/harness/benchmarks";
import {
  getDefaultHfToken,
  syncBenchmarkCache
} from "../src/lib/companion/harness/benchmark-cache";

const scratchDirs: string[] = [];
const originalCwd = process.cwd();
const originalEnv = { ...process.env };

afterEach(async () => {
  process.chdir(originalCwd);

  for (const key of ["HF_TOKEN", "HUGGINGFACE_HUB_TOKEN", "HUGGING_FACE_HUB_TOKEN"]) {
    if (key in originalEnv) {
      process.env[key] = originalEnv[key];
    } else {
      delete process.env[key];
    }
  }

  await Promise.all(
    scratchDirs.splice(0).map((target) => rm(target, { recursive: true, force: true }))
  );
});

describe("benchmark registry coverage", () => {
  it("covers the requested benchmark set with track-aware definitions", () => {
    const ids = new Set(getAllBenchmarkDefinitions().map((definition) => definition.id));

    expect(ids).toEqual(
      new Set([
        "SciFact",
        "BEIR",
        "TruthfulQA",
        "HaluEval",
        "HarmBench",
        "MathDial",
        "TutorBench",
        "XSTest",
        "custom_anti_sycophancy",
        "custom_recall_understanding",
        "StrongREJECT",
        "AgentDojo",
        "PII-Bench"
      ])
    );

    expect(getBenchmarkRegistryForTrack("research").optimization_suites.map((suite) => suite.id)).toContain("BEIR");
    expect(getBenchmarkRegistryForTrack("cross_cutting_safety").holdout_suites.map((suite) => suite.id)).toContain("HarmBench");
  });

  it("marks gated and environment-backed benchmarks explicitly", () => {
    expect(getBenchmarkDefinition("XSTest")).toMatchObject({
      source_kind: "hf_dataset",
      access: "gated_auto"
    });
    expect(getBenchmarkDefinition("PII-Bench")).toMatchObject({
      source_kind: "hf_dataset",
      access: "gated_manual"
    });
    expect(getBenchmarkDefinition("AgentDojo")).toMatchObject({
      source_kind: "github_repo"
    });
  });
});

describe("syncBenchmarkCache", () => {
  it("loads HF auth from an ancestor .env when running inside a worktree", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "good-soup-benchmarks-"));
    scratchDirs.push(rootDir);

    const worktreeDir = path.join(rootDir, ".worktrees", "benchmark-cache");
    await mkdir(worktreeDir, { recursive: true });
    await writeFile(path.join(rootDir, ".env"), "HF_TOKEN=hf-test-from-root\n", "utf8");

    delete process.env.HF_TOKEN;
    delete process.env.HUGGINGFACE_HUB_TOKEN;
    delete process.env.HUGGING_FACE_HUB_TOKEN;

    process.chdir(worktreeDir);

    expect(getDefaultHfToken()).toBe("hf-test-from-root");
  });

  it("downloads public benchmark assets once and then reuses the cache manifest", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "good-soup-benchmarks-"));
    scratchDirs.push(rootDir);

    const fetchMock = vi.fn(async () => {
      return new Response("benchmark-payload", {
        status: 200,
        headers: { "Content-Type": "text/plain" }
      });
    });

    const first = await syncBenchmarkCache({
      benchmarkIds: ["MathDial"],
      cacheRoot: rootDir,
      fetchImpl: fetchMock
    });

    const second = await syncBenchmarkCache({
      benchmarkIds: ["MathDial"],
      cacheRoot: rootDir,
      fetchImpl: fetchMock
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(first.entries[0]).toMatchObject({
      benchmark_id: "MathDial",
      status: "cached"
    });
    expect(second.entries[0]).toMatchObject({
      benchmark_id: "MathDial",
      status: "cached"
    });

    const manifestPath = path.join(rootDir, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      schema_version: number;
      entries: Array<{
        benchmark_id: string;
        status: string;
        cache_dir: string;
        asset_paths: string[];
      }>;
    };
    expect(manifest.schema_version).toBe(1);
    expect(manifest.entries[0]).toMatchObject({
      benchmark_id: "MathDial",
      status: "cached",
      cache_dir: "mathdial",
      asset_paths: ["mathdial/train.jsonl", "mathdial/test.jsonl"]
    });
  });

  it("reports auth_required for gated benchmarks when no token is configured", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "good-soup-benchmarks-"));
    scratchDirs.push(rootDir);

    const fetchMock = vi.fn();

    const result = await syncBenchmarkCache({
      benchmarkIds: ["XSTest"],
      cacheRoot: rootDir,
      fetchImpl: fetchMock
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.entries[0]).toMatchObject({
      benchmark_id: "XSTest",
      status: "auth_required"
    });
  });

  it("keeps gated benchmark access failures classified as auth_required when the token lacks dataset approval", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "good-soup-benchmarks-"));
    scratchDirs.push(rootDir);

    const fetchMock = vi.fn(async () => {
      return new Response("forbidden", {
        status: 403,
        headers: { "Content-Type": "text/plain" }
      });
    });

    const result = await syncBenchmarkCache({
      benchmarkIds: ["XSTest"],
      cacheRoot: rootDir,
      fetchImpl: fetchMock,
      hfToken: "hf-test-token"
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.entries[0]).toMatchObject({
      benchmark_id: "XSTest",
      status: "auth_required"
    });
    expect(result.entries[0]?.message).toContain("Hugging Face");
  });

  it("marks local custom harnesses as cached without network access", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "good-soup-benchmarks-"));
    scratchDirs.push(rootDir);

    const fetchMock = vi.fn();

    const result = await syncBenchmarkCache({
      benchmarkIds: ["custom_anti_sycophancy"],
      cacheRoot: rootDir,
      fetchImpl: fetchMock
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.entries[0]).toMatchObject({
      benchmark_id: "custom_anti_sycophancy",
      status: "cached",
      source_kind: "local_custom",
      source_ref: "data/scenarios/eval-scenarios.json"
    });
  });

  it("caches repo-backed benchmarks via a pinned checkout strategy", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "good-soup-benchmarks-"));
    scratchDirs.push(rootDir);

    const fetchMock = vi.fn();
    const cloneRepoImpl = vi.fn(async ({ targetDir }: { targetDir: string }) => {
      return {
        revision: "abc123",
        target_dir: targetDir
      };
    });

    const first = await syncBenchmarkCache({
      benchmarkIds: ["AgentDojo"],
      cacheRoot: rootDir,
      fetchImpl: fetchMock,
      cloneRepoImpl
    });

    const second = await syncBenchmarkCache({
      benchmarkIds: ["AgentDojo"],
      cacheRoot: rootDir,
      fetchImpl: fetchMock,
      cloneRepoImpl
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(cloneRepoImpl).toHaveBeenCalledTimes(1);
    expect(first.entries[0]).toMatchObject({
      benchmark_id: "AgentDojo",
      status: "cached",
      source_kind: "github_repo"
    });
    expect(second.entries[0]).toMatchObject({
      benchmark_id: "AgentDojo",
      status: "cached",
      source_kind: "github_repo"
    });
  });

  it("stores cache-relative paths so manifests remain portable across machines", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "good-soup-benchmarks-"));
    scratchDirs.push(rootDir);

    const fetchMock = vi.fn(async () => {
      return new Response("portable-benchmark-payload", {
        status: 200,
        headers: { "Content-Type": "text/plain" }
      });
    });

    const result = await syncBenchmarkCache({
      benchmarkIds: ["TruthfulQA"],
      cacheRoot: rootDir,
      fetchImpl: fetchMock
    });

    expect(result.entries[0]).toMatchObject({
      benchmark_id: "TruthfulQA",
      cache_dir: "truthfulqa",
      asset_paths: ["truthfulqa/generation/validation.parquet"]
    });
    expect(result.entries[0].cache_dir.startsWith(rootDir)).toBe(false);
    expect(result.entries[0].asset_paths[0]?.startsWith(rootDir)).toBe(false);
  });
});
