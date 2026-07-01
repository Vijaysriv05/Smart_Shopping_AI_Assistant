export function getSessionId(): string {
  let sessionId = localStorage.getItem("shopping-ai-session-id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("shopping-ai-session-id", sessionId);
  }
  return sessionId;
}
