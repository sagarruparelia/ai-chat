export interface User {
  id: string;
  sessionId: string;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface Chat {
  id: string;
  userId: string;
  sessionId: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  browserFingerprint: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface CreateChatRequest {
  title?: string;
}

export interface SendMessageRequest {
  chatId: string;
  content: string;
  lat?: number;
  lng?: number;
}

export interface ChatServiceRequest {
  session_id: string;
  prompt: string;
  lat: number;
  lng: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export type StreamStatus = 'idle' | 'streaming' | 'complete' | 'error';
