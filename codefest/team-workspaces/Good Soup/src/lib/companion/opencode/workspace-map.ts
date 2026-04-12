import { mkdir, readFile, writeFile } from "node:fs/promises";
import { realpathSync } from "node:fs";
import path from "node:path";

export interface WorkspaceRecord {
  id: string;
  path: string;
  data_dir?: string;
  debug?: boolean;
  yolo?: boolean;
  version?: string;
  env?: string[];
}

export interface WorkspaceMap {
  get(path: string): Promise<WorkspaceRecord | undefined>;
  set(workspace: WorkspaceRecord): Promise<void>;
}

function defaultRootDir(rootDir?: string): string {
  return rootDir ?? path.join(process.cwd(), "data", "opencode-workspaces");
}

export function canonicalizeWorkspacePath(value: string): string {
  try {
    return realpathSync(value);
  } catch {
    return path.resolve(value);
  }
}

export function createWorkspaceMap(rootDir?: string): WorkspaceMap {
  const dir = defaultRootDir(rootDir);
  const filePath = path.join(dir, "workspaces.json");
  let cache: WorkspaceRecord[] | null = null;

  async function load(): Promise<WorkspaceRecord[]> {
    if (cache) {
      return cache;
    }

    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      cache = Array.isArray(parsed)
        ? parsed.filter((item): item is WorkspaceRecord => {
            if (!item || typeof item !== "object") {
              return false;
            }
            const record = item as Partial<WorkspaceRecord>;
            return typeof record.id === "string" && typeof record.path === "string";
          }).map((record) => ({
            ...record,
            path: canonicalizeWorkspacePath(record.path)
          }))
        : [];
    } catch {
      cache = [];
    }

    return cache;
  }

  async function save(workspaces: WorkspaceRecord[]): Promise<void> {
    cache = workspaces;
    await mkdir(dir, { recursive: true });
    await writeFile(filePath, JSON.stringify(workspaces, null, 2), "utf8");
  }

  return {
    async get(pathname: string): Promise<WorkspaceRecord | undefined> {
      const canonicalPath = canonicalizeWorkspacePath(pathname);
      const workspaces = await load();
      return workspaces.find((workspace) => workspace.path === canonicalPath);
    },
    async set(workspace: WorkspaceRecord): Promise<void> {
      const canonicalPath = canonicalizeWorkspacePath(workspace.path);
      const workspaces = await load();
      const next = workspaces.filter((item) => item.path !== canonicalPath && item.id !== workspace.id);
      next.push({
        id: workspace.id,
        path: canonicalPath,
        data_dir: workspace.data_dir,
        debug: workspace.debug,
        yolo: workspace.yolo,
        version: workspace.version,
        env: workspace.env
      });
      await save(next);
    }
  };
}
