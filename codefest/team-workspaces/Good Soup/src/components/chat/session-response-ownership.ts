export function shouldAppendResponseToVisibleThread(input: {
  activeSessionId: string | null;
  requestSessionId: string;
}): boolean {
  return input.activeSessionId === input.requestSessionId;
}
