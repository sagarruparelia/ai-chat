import { User, Chat, Message, Session } from '@ce-ai/types/chat';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory storage for users, sessions, and chats
 * NOTE: This will reset when the server restarts
 * For production, consider using Redis or a database
 */
class InMemoryStorage {
  private users: Map<string, User> = new Map();
  private sessions: Map<string, Session> = new Map();
  private chats: Map<string, Chat> = new Map();
  private userChatIndex: Map<string, string[]> = new Map(); // userId -> chatIds[]

  // User operations
  createUser(sessionId: string): User {
    const user: User = {
      id: uuidv4(),
      sessionId,
      createdAt: new Date(),
      lastActiveAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  getUserById(userId: string): User | undefined {
    return this.users.get(userId);
  }

  getUserBySessionId(sessionId: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.sessionId === sessionId) {
        return user;
      }
    }
    return undefined;
  }

  updateUserActivity(userId: string): void {
    const user = this.users.get(userId);
    if (user) {
      user.lastActiveAt = new Date();
      this.users.set(userId, user);
    }
  }

  // Session operations
  createSession(session: Session): void {
    this.sessions.set(session.id, session);
  }

  getSessionById(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  // Chat operations
  // Each chat is its own session - chatId === sessionId
  createChat(userId: string, title?: string): Chat {
    const chatId = uuidv4();
    const chat: Chat = {
      id: chatId,
      userId,
      sessionId: chatId, // chatId and sessionId are the same
      title: title || `Chat ${new Date().toLocaleDateString()}`,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.chats.set(chat.id, chat);

    // Update user chat index
    const userChats = this.userChatIndex.get(userId) || [];
    userChats.push(chat.id);
    this.userChatIndex.set(userId, userChats);

    return chat;
  }

  getChatById(chatId: string): Chat | undefined {
    return this.chats.get(chatId);
  }

  getChatsByUserId(userId: string): Chat[] {
    const chatIds = this.userChatIndex.get(userId) || [];
    return chatIds
      .map(id => this.chats.get(id))
      .filter((chat): chat is Chat => chat !== undefined)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  getChatsBySessionId(sessionId: string): Chat[] {
    const chats: Chat[] = [];
    for (const chat of this.chats.values()) {
      if (chat.sessionId === sessionId) {
        chats.push(chat);
      }
    }
    return chats.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  updateChat(chatId: string, updates: Partial<Chat>): Chat | undefined {
    const chat = this.chats.get(chatId);
    if (!chat) return undefined;

    const updatedChat = {
      ...chat,
      ...updates,
      updatedAt: new Date(),
    };

    this.chats.set(chatId, updatedChat);
    return updatedChat;
  }

  deleteChat(chatId: string): void {
    const chat = this.chats.get(chatId);
    if (chat) {
      // Remove from user chat index
      const userChats = this.userChatIndex.get(chat.userId) || [];
      const filtered = userChats.filter(id => id !== chatId);
      this.userChatIndex.set(chat.userId, filtered);

      // Delete chat
      this.chats.delete(chatId);
    }
  }

  // Message operations
  addMessage(chatId: string, role: Message['role'], content: string): Message | undefined {
    const chat = this.chats.get(chatId);
    if (!chat) return undefined;

    const message: Message = {
      id: uuidv4(),
      chatId,
      role,
      content,
      timestamp: new Date(),
    };

    chat.messages.push(message);
    chat.updatedAt = new Date();

    // Update chat title based on first user message
    if (chat.messages.length === 1 && role === 'user') {
      chat.title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
    }

    this.chats.set(chatId, chat);
    return message;
  }

  getMessages(chatId: string): Message[] {
    const chat = this.chats.get(chatId);
    return chat?.messages || [];
  }

  // Cleanup operations
  cleanupExpiredSessions(): number {
    let removed = 0;
    const now = new Date();

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(sessionId);
        removed++;
      }
    }

    return removed;
  }

  // Debug/stats operations
  getStats() {
    return {
      users: this.users.size,
      sessions: this.sessions.size,
      chats: this.chats.size,
    };
  }
}

// Export a singleton instance
export const storage = new InMemoryStorage();
