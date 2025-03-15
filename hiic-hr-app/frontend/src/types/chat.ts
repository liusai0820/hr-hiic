// 聊天消息类型
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// 聊天请求类型
export interface ChatRequest {
  messages: ChatMessage[];
}

// 聊天响应类型
export interface ChatResponse {
  response: string;
} 