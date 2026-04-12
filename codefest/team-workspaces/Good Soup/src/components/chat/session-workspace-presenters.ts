import type { ChatThreadMessage } from "./chat-thread";
export { buildSessionResourceLedger } from "./session-resource-ledger";

import type { SessionMessageRecord, SessionWorkspaceEntry } from "@/types/companion";

export interface SessionFolderGroup {
  folder: string | null;
  label: string;
  sessions: SessionWorkspaceEntry[];
}

export interface GroupedSessionDisplay {
  active: SessionFolderGroup[];
  archived: SessionFolderGroup[];
}

function buildGroups(sessions: SessionWorkspaceEntry[]): SessionFolderGroup[] {
  const grouped = new Map<string, SessionWorkspaceEntry[]>();

  for (const session of sessions) {
    const key = session.folder ?? "";
    grouped.set(key, [...(grouped.get(key) ?? []), session]);
  }

  return [...grouped.entries()]
    .sort(([leftKey], [rightKey]) => {
      if (!leftKey && rightKey) {
        return 1;
      }

      if (leftKey && !rightKey) {
        return -1;
      }

      return leftKey.localeCompare(rightKey);
    })
    .map(([folder, folderSessions]) => ({
      folder: folder || null,
      label: folder || "Ungrouped",
      sessions: folderSessions.sort((left, right) => right.touched_at.localeCompare(left.touched_at))
    }));
}

export function groupSessionsForDisplay(sessions: SessionWorkspaceEntry[]): GroupedSessionDisplay {
  const active = sessions.filter((session) => session.archived_at === null);
  const archived = sessions.filter((session) => session.archived_at !== null);

  return {
    active: buildGroups(active),
    archived: buildGroups(archived)
  };
}

export function toChatThreadMessages(records: SessionMessageRecord[]): ChatThreadMessage[] {
  return records.map((record) => ({
    id: record.id,
    role: record.role,
    content: record.content,
    attachments: record.attachments,
    result: record.result,
    timestamp: new Date(record.timestamp)
  }));
}
