import type { PrimaryAgentDraft, PrimaryAgentInput } from "../contracts";
import {
  buildPrompt,
  buildSystemPrompt,
  normalizeDraft
} from "../primary-agent";
import {
  canonicalizeWorkspacePath,
  createWorkspaceMap,
  type WorkspaceRecord
} from "./workspace-map";
import { createSessionMap } from "./session-map";

const sessionMap = new Map<string, string>();
const workspaceBootstrapMap = new Map<string, Promise<string>>();

interface OpenCodeOptions {
  serverUrl: string;
  model?: string;
  agent?: string;
  username?: string;
  password?: string;
  fetchImpl?: typeof fetch;
  workspaceMapRoot?: string;
  sessionMapRoot?: string;
}

interface OpenCodeMessagePart {
  type?: string;
  tool?: string;
  state?: {
    status?: string;
    input?: unknown;
  };
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function buildAuthHeader(username?: string, password?: string): string | undefined {
  if (!password) {
    return undefined;
  }

  const user = username || "opencode";
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

function buildModel(model?: string): { providerID: string; modelID: string } | undefined {
  if (!model) {
    return undefined;
  }

  const [providerID, ...rest] = model.split("/");
  if (rest.length === 0) {
    return {
      providerID: "openai",
      modelID: providerID
    };
  }

  return {
    providerID,
    modelID: rest.join("/")
  };
}

export function resetOpenCodeAdapterState(): void {
  sessionMap.clear();
  workspaceBootstrapMap.clear();
}

function buildWorkspaceBody(workspacePath: string): Pick<WorkspaceRecord, "path"> {
  return {
    path: workspacePath
  };
}

function workspaceBootstrapKey(serverUrl: string, workspaceMapRoot: string | undefined, workspacePath: string): string {
  return [serverUrl, workspaceMapRoot ?? "", canonicalizeWorkspacePath(workspacePath)].join("::");
}

async function listWorkspaces(
  options: Required<Pick<OpenCodeOptions, "serverUrl" | "fetchImpl">> & Pick<OpenCodeOptions, "username" | "password">
): Promise<WorkspaceRecord[]> {
  const authHeader = buildAuthHeader(options.username, options.password);
  const response = await options.fetchImpl(`${options.serverUrl}/v1/workspaces`, {
    method: "GET",
    headers: {
      ...(authHeader ? { Authorization: authHeader } : {})
    }
  });

  if (!response.ok) {
    throw new Error(`OpenCode workspace listing failed with ${response.status}.`);
  }

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const workspace = item as Partial<WorkspaceRecord>;
    if (typeof workspace.id !== "string" || typeof workspace.path !== "string") {
      return [];
    }

    return [
      {
        id: workspace.id,
        path: workspace.path,
        data_dir: typeof workspace.data_dir === "string" ? workspace.data_dir : undefined,
        debug: typeof workspace.debug === "boolean" ? workspace.debug : undefined,
        yolo: typeof workspace.yolo === "boolean" ? workspace.yolo : undefined,
        version: typeof workspace.version === "string" ? workspace.version : undefined,
        env: Array.isArray(workspace.env) ? workspace.env.filter((value): value is string => typeof value === "string") : undefined
      }
    ];
  });
}

async function fetchWorkspaceById(
  options: Required<Pick<OpenCodeOptions, "serverUrl" | "fetchImpl">> & Pick<OpenCodeOptions, "username" | "password">,
  workspaceId: string
): Promise<WorkspaceRecord | undefined> {
  const authHeader = buildAuthHeader(options.username, options.password);
  const response = await options.fetchImpl(`${options.serverUrl}/v1/workspaces/${workspaceId}`, {
    method: "GET",
    headers: {
      ...(authHeader ? { Authorization: authHeader } : {})
    }
  });

  if (!response.ok) {
    return undefined;
  }

  const payload = (await response.json()) as Partial<WorkspaceRecord>;
  if (typeof payload.id !== "string" || typeof payload.path !== "string") {
    return undefined;
  }

  return {
    id: payload.id,
    path: canonicalizeWorkspacePath(payload.path),
    data_dir: typeof payload.data_dir === "string" ? payload.data_dir : undefined,
    debug: typeof payload.debug === "boolean" ? payload.debug : undefined,
    yolo: typeof payload.yolo === "boolean" ? payload.yolo : undefined,
    version: typeof payload.version === "string" ? payload.version : undefined,
    env: Array.isArray(payload.env) ? payload.env.filter((value): value is string => typeof value === "string") : undefined
  };
}

async function getOrCreateWorkspaceId(
  options: Required<Pick<OpenCodeOptions, "serverUrl" | "fetchImpl">> & Pick<OpenCodeOptions, "username" | "password" | "workspaceMapRoot">,
  workspacePath: string
): Promise<string> {
  const canonicalPath = canonicalizeWorkspacePath(workspacePath);
  const key = workspaceBootstrapKey(options.serverUrl, options.workspaceMapRoot, canonicalPath);
  const inFlight = workspaceBootstrapMap.get(key);
  if (inFlight) {
    return inFlight;
  }

  const bootstrap = (async () => {
    const workspaceMap = createWorkspaceMap(options.workspaceMapRoot);
    const cachedWorkspace = await workspaceMap.get(canonicalPath);
    if (cachedWorkspace?.id) {
      const backendWorkspace = await fetchWorkspaceById(options, cachedWorkspace.id);
      if (backendWorkspace && canonicalizeWorkspacePath(backendWorkspace.path) === canonicalPath) {
        await workspaceMap.set(backendWorkspace);
        return backendWorkspace.id;
      }
    }

    let backendWorkspaces: WorkspaceRecord[];
    try {
      backendWorkspaces = await listWorkspaces(options);
    } catch {
      throw new Error("OpenCode workspace listing failed and no cached workspace could be validated.");
    }

    const existingWorkspace = backendWorkspaces.find(
      (workspace) => canonicalizeWorkspacePath(workspace.path) === canonicalPath
    );

    if (existingWorkspace?.id) {
      await workspaceMap.set(existingWorkspace);
      return existingWorkspace.id;
    }

    const authHeader = buildAuthHeader(options.username, options.password);
    const response = await options.fetchImpl(`${options.serverUrl}/v1/workspaces`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {})
      },
      body: JSON.stringify(buildWorkspaceBody(canonicalPath))
    });

    if (!response.ok) {
      throw new Error(`OpenCode workspace creation failed with ${response.status}.`);
    }

    const payload = (await response.json()) as Partial<WorkspaceRecord>;
    if (typeof payload.id !== "string" || typeof payload.path !== "string") {
      throw new Error("OpenCode workspace response did not include an id and path.");
    }

    const workspace = {
      id: payload.id,
      path: canonicalizeWorkspacePath(payload.path),
      data_dir: typeof payload.data_dir === "string" ? payload.data_dir : undefined,
      debug: typeof payload.debug === "boolean" ? payload.debug : undefined,
      yolo: typeof payload.yolo === "boolean" ? payload.yolo : undefined,
      version: typeof payload.version === "string" ? payload.version : undefined,
      env: Array.isArray(payload.env) ? payload.env.filter((value): value is string => typeof value === "string") : undefined
    };

    await workspaceMap.set(workspace);
    return workspace.id;
  })();

  workspaceBootstrapMap.set(key, bootstrap);

  try {
    return await bootstrap;
  } finally {
    workspaceBootstrapMap.delete(key);
  }
}

function structuredFormat() {
  return {
    type: "json_schema",
    retryCount: 1,
    schema: {
      type: "object",
      properties: {
        answer: { type: "string" },
        claims: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string" },
              evidence_ref_ids: {
                type: "array",
                items: { type: "string" }
              },
              certainty: {
                type: "string",
                enum: ["low", "medium", "high"]
              }
            },
            required: ["text", "evidence_ref_ids", "certainty"]
          }
        },
        citations_used: {
          type: "array",
          items: { type: "string" }
        },
        student_model: {
          type: "object",
          properties: {
            understanding_level: {
              type: "string",
              enum: ["low", "partial", "strong"]
            },
            misconceptions: {
              type: "array",
              items: { type: "string" }
            },
            missing_steps: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["understanding_level", "misconceptions", "missing_steps"]
        },
        proposed_actions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string" },
              target: { type: "string" },
              details: { type: "string" },
              requires_confirmation: { type: "boolean" }
            },
            required: ["type", "target", "details", "requires_confirmation"]
          }
        },
        uncertainty_notes: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: [
        "answer",
        "claims",
        "citations_used",
        "student_model",
        "proposed_actions",
        "uncertainty_notes"
      ]
    }
  };
}

function extractStructuredToolInput(parts: unknown): unknown {
  if (!Array.isArray(parts)) {
    return undefined;
  }

  for (const part of parts as OpenCodeMessagePart[]) {
    if (
      part?.type === "tool" &&
      part.tool === "StructuredOutput" &&
      part.state?.status === "completed"
    ) {
      return part.state.input;
    }
  }

  return undefined;
}

async function getOrCreateSessionId(
  frontendSessionId: string,
  options: Required<Pick<OpenCodeOptions, "serverUrl" | "fetchImpl">> &
    Pick<OpenCodeOptions, "username" | "password" | "sessionMapRoot">
): Promise<string> {
  const existing = sessionMap.get(frontendSessionId);
  if (existing) {
    return existing;
  }

  const persistentMap = createSessionMap(options.sessionMapRoot);
  const persisted = await persistentMap.get(frontendSessionId);
  if (persisted?.session_id) {
    const authHeader = buildAuthHeader(options.username, options.password);
    const existingResponse = await options.fetchImpl(`${options.serverUrl}/session/${persisted.session_id}`, {
      method: "GET",
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {})
      }
    });

    if (existingResponse.ok) {
      sessionMap.set(frontendSessionId, persisted.session_id);
      return persisted.session_id;
    }
  }

  const authHeader = buildAuthHeader(options.username, options.password);
  const response = await options.fetchImpl(`${options.serverUrl}/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {})
    },
    body: JSON.stringify({
      title: `Verified Student Research Companion · ${frontendSessionId} · internal revision`
    })
  });

  if (!response.ok) {
    throw new Error(`OpenCode session creation failed with ${response.status}.`);
  }

  const payload = (await response.json()) as { id?: string };
  if (!payload.id) {
    throw new Error("OpenCode session response did not include an id.");
  }

  sessionMap.set(frontendSessionId, payload.id);
  await persistentMap.set({
    frontend_session_id: frontendSessionId,
    session_id: payload.id
  });
  return payload.id;
}

async function createEphemeralSessionId(
  frontendSessionId: string,
  options: Required<Pick<OpenCodeOptions, "serverUrl" | "fetchImpl">> &
    Pick<OpenCodeOptions, "username" | "password">
): Promise<string> {
  const authHeader = buildAuthHeader(options.username, options.password);
  const response = await options.fetchImpl(`${options.serverUrl}/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {})
    },
    body: JSON.stringify({
      title: `Verified Student Research Companion · ${frontendSessionId}`
    })
  });

  if (!response.ok) {
    throw new Error(`OpenCode session creation failed with ${response.status}.`);
  }

  const payload = (await response.json()) as { id?: string };
  if (!payload.id) {
    throw new Error("OpenCode session response did not include an id.");
  }

  return payload.id;
}

export async function runPrimaryAgentViaOpenCode(
  input: PrimaryAgentInput,
  options: OpenCodeOptions
): Promise<PrimaryAgentDraft> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const serverUrl = stripTrailingSlash(options.serverUrl);
  const authHeader = buildAuthHeader(options.username, options.password);
  const workspacePath = canonicalizeWorkspacePath(process.cwd());
  await getOrCreateWorkspaceId(
    {
      serverUrl,
      fetchImpl,
      username: options.username,
      password: options.password,
      workspaceMapRoot: options.workspaceMapRoot
    },
    workspacePath
  ).catch(() => undefined);
  const sessionId = await getOrCreateSessionId(input.session_id, {
    serverUrl,
    fetchImpl,
    username: options.username,
    password: options.password,
    sessionMapRoot: options.sessionMapRoot
  });
  const targetSessionId = input.revision_brief
    ? await createEphemeralSessionId(input.session_id, {
        serverUrl,
        fetchImpl,
        username: options.username,
        password: options.password
      })
    : sessionId;

  const response = await fetchImpl(`${serverUrl}/session/${targetSessionId}/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {})
    },
    body: JSON.stringify({
      ...(buildModel(options.model) ? { model: buildModel(options.model) } : {}),
      ...(options.agent ? { agent: options.agent } : {}),
      system: buildSystemPrompt(input.mode),
      format: structuredFormat(),
      parts: [
        {
          type: "text",
          text: buildPrompt(input)
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenCode prompt failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    info?: {
      structured?: unknown;
      structured_output?: unknown;
    };
    parts?: unknown;
  };

  if (payload.info?.structured) {
    return normalizeDraft(payload.info.structured, input);
  }

  if (payload.info?.structured_output) {
    return normalizeDraft(payload.info.structured_output, input);
  }

  const toolInput = extractStructuredToolInput(payload.parts);
  if (toolInput) {
    return normalizeDraft(toolInput, input);
  }

  throw new Error("Primary agent response did not include structured output.");
}
