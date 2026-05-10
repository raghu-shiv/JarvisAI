const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL ?? "ws://localhost:8000/ws";

export function createChatSocket(conversationId: string, token: string) {
  return new WebSocket(`${WS_BASE_URL}/chat/${conversationId}/?token=${encodeURIComponent(token)}`);
}
