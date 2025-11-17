'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchEventSource, EventSourceMessage } from '@microsoft/fetch-event-source';
import { Chat, Message, User, Session, StreamStatus } from '@ce-ai/types/chat';

// Custom error classes for controlling retry behavior with fetch-event-source
class FatalError extends Error { }
class RetriableError extends Error { }

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

  // Send message with streaming support using @microsoft/fetch-event-source
  const sendMessage = useCallback(async (chatId: string, content: string, lat?: number, lng?: number) => {
    // Create optimistic user message
    const optimisticUserMessage: Message = {
      id: `temp-${Date.now()}`,
      chatId,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    // Add user message to chat immediately (optimistic update)
    setCurrentChat((prev) => {
      if (!prev || prev.id !== chatId) return prev;
      return {
        ...prev,
        messages: [...prev.messages, optimisticUserMessage],
      };
    });

    // Also update in chats array (for new chats where currentChat might not be set yet)
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: [...chat.messages, optimisticUserMessage],
          };
        }
        return chat;
      })
    );

    // Reset streaming state
    setStreamStatus('streaming');
    setStreamingContent('');

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    let userMessage: Message | null = null;
    let assistantMessage: Message | null = null;

    try {
      await fetchEventSource('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ chatId, content, lat, lng }),
        signal: abortControllerRef.current.signal,

        async onopen(response) {
          if (response.ok) {
            return; // Connection successful
          }

          // Handle client errors (4xx) - don't retry except for 429 (rate limit)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            const error = await response.text();
            console.error('Client error:', error);
            throw new FatalError(`Client error: ${response.status}`);
          }

          // Handle server errors (5xx) - will retry
          throw new Error(`Server error: ${response.status}`);
        },

        onmessage(event: EventSourceMessage) {
          // Parse the SSE event data
          try {
            const data = JSON.parse(event.data);

            switch (data.type) {
              case 'user_message':
                userMessage = data.data;
                // Replace optimistic message with real one from server in currentChat
                setCurrentChat((prev) => {
                  if (prev?.id !== chatId) return prev;
                  const messagesWithoutTemp = prev.messages.filter((msg) => !msg.id.startsWith('temp-'));
                  return {
                    ...prev,
                    messages: [...messagesWithoutTemp, data.data],
                  };
                });

                // Also update in chats array
                setChats((prev) =>
                  prev.map((chat) => {
                    if (chat.id === chatId) {
                      const messagesWithoutTemp = chat.messages.filter((msg) => !msg.id.startsWith('temp-'));
                      return {
                        ...chat,
                        messages: [...messagesWithoutTemp, data.data],
                      };
                    }
                    return chat;
                  })
                );
                break;

              case 'stream_start':
                setStreamStatus('streaming');
                break;

              case 'chunk':
                // Accumulate streaming content
                setStreamingContent((prev) => prev + data.data);
                break;

              case 'stream_complete':
                assistantMessage = data.data;
                setStreamStatus('complete');
                setStreamingContent('');

                // Add final assistant message to currentChat
                setCurrentChat((prev) => {
                  if (!prev || prev.id !== chatId) return prev;
                  return {
                    ...prev,
                    messages: [...prev.messages, data.data],
                  };
                });

                // Also add to chats array
                setChats((prev) =>
                  prev.map((chat) => {
                    if (chat.id === chatId) {
                      return {
                        ...chat,
                        messages: [...chat.messages, data.data],
                      };
                    }
                    return chat;
                  })
                );

                // Reset status to idle after 2 seconds
                setTimeout(() => {
                  setStreamStatus('idle');
                }, 2000);
                break;

              case 'error':
                setStreamStatus('error');
                setError(data.error || 'Stream error');
                throw new FatalError(data.error || 'Stream error');
            }
          } catch (parseError) {
            console.error('Failed to parse SSE event:', parseError);
            // Don't throw - just log and continue
          }
        },

        onclose() {
          // Server closed the connection - this is normal after stream completes
          setStreamStatus('complete');
        },

        onerror(err) {
          console.error('SSE error:', err);

          // If it's a fatal error, stop retrying
          if (err instanceof FatalError) {
            throw err;
          }

          // For other errors, let the library handle retry logic
          // The library will automatically retry with exponential backoff
        },
      });

      // Messages are already added to chats via optimistic updates and event handlers
      return { userMessage, assistantMessage };
    } catch (err) {
      // Remove optimistic message on error from currentChat
      setCurrentChat((prev) => {
        if (!prev || prev.id !== chatId) return prev;
        return {
          ...prev,
          messages: prev.messages.filter((msg) => !msg.id.startsWith('temp-')),
        };
      });

      // Remove optimistic message from chats array
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: chat.messages.filter((msg) => !msg.id.startsWith('temp-')),
            };
          }
          return chat;
        })
      );

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

      // Remove optimistic message if stream was cancelled from currentChat
      setCurrentChat((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.filter((msg) => !msg.id.startsWith('temp-')),
        };
      });

      // Remove optimistic message from chats array
      setChats((prev) =>
        prev.map((chat) => ({
          ...chat,
          messages: chat.messages.filter((msg) => !msg.id.startsWith('temp-')),
        }))
      );
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
