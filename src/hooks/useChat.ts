'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Chat, Message, User, Session, StreamStatus } from '@ce-ai/types/chat';

export function useChat() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle');
  const [streamingContent, setStreamingContent] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize user session
  const initializeSession = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/init', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.data.user);
        setSession(data.data.session);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to initialize session');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load chats
  const loadChats = useCallback(async () => {
    try {
      const response = await fetch('/api/chats', {
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setChats(data.data.chats);
      }
    } catch (err) {
      console.error('Failed to load chats:', err);
    }
  }, []);

  // Create new chat
  const createChat = useCallback(async (title?: string) => {
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ title }),
      });

      const data = await response.json();

      if (data.success) {
        const newChat = data.data.chat;
        setChats((prev) => [newChat, ...prev]);
        setCurrentChat(newChat);
        return newChat;
      }
    } catch (err) {
      console.error('Failed to create chat:', err);
    }
  }, []);

  // Send message with streaming support
  const sendMessage = useCallback(async (chatId: string, content: string, lat?: number, lng?: number) => {
    try {
      // Reset streaming state
      setStreamStatus('streaming');
      setStreamingContent('');

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ chatId, content, lat, lng }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = '';
      let userMessage: Message | null = null;
      let assistantMessage: Message | null = null;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          setStreamStatus('complete');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process Server-Sent Events
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();

            if (!data) continue;

            try {
              const event = JSON.parse(data);

              switch (event.type) {
                case 'user_message':
                  userMessage = event.data;
                  // Add user message to chat immediately
                  setCurrentChat((prev) => {
                    if (!prev || prev.id !== chatId) return prev;
                    return {
                      ...prev,
                      messages: [...prev.messages, event.data],
                    };
                  });
                  break;

                case 'stream_start':
                  setStreamStatus('streaming');
                  break;

                case 'chunk':
                  // Accumulate streaming content
                  setStreamingContent((prev) => prev + event.data);
                  break;

                case 'stream_complete':
                  assistantMessage = event.data;
                  setStreamStatus('complete');
                  setStreamingContent('');

                  // Add final assistant message to chat
                  setCurrentChat((prev) => {
                    if (!prev || prev.id !== chatId) return prev;
                    return {
                      ...prev,
                      messages: [...prev.messages, event.data],
                    };
                  });

                  // Reset status to idle after 2 seconds
                  setTimeout(() => {
                    setStreamStatus('idle');
                  }, 2000);
                  break;

                case 'error':
                  setStreamStatus('error');
                  setError(event.error || 'Stream error');
                  break;
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', e);
            }
          }
        }
      }

      // Update chats list
      if (userMessage && assistantMessage) {
        setChats((prev) =>
          prev.map((chat) => {
            if (chat.id === chatId) {
              return {
                ...chat,
                messages: [...chat.messages, userMessage!, assistantMessage!],
              };
            }
            return chat;
          })
        );
      }

      return { userMessage, assistantMessage };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Stream cancelled');
        setStreamStatus('idle');
      } else {
        console.error('Failed to send message:', err);
        setStreamStatus('error');
        setError('Failed to send message');
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, []);

  // Cancel streaming
  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStreamStatus('idle');
      setStreamingContent('');
    }
  }, []);

  // Delete chat
  const deleteChat = useCallback(async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setChats((prev) => prev.filter((chat) => chat.id !== chatId));
        if (currentChat?.id === chatId) {
          setCurrentChat(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  }, [currentChat]);

  // Load chat by ID
  const loadChat = useCallback(async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setCurrentChat(data.data.chat);
      }
    } catch (err) {
      console.error('Failed to load chat:', err);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  // Load chats when user is initialized
  useEffect(() => {
    if (user) {
      loadChats();
    }
  }, [user, loadChats]);

  return {
    user,
    session,
    chats,
    currentChat,
    loading,
    error,
    streamStatus,
    streamingContent,
    createChat,
    sendMessage,
    deleteChat,
    loadChat,
    setCurrentChat,
    cancelStream,
  };
}
