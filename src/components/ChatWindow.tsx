'use client';

import { useEffect, useRef } from 'react';
import { Chat, StreamStatus } from '@ce-ai/types/chat';

interface ChatWindowProps {
  chat: Chat | null;
  streamStatus: StreamStatus;
  streamingContent: string;
}

export function ChatWindow({ chat, streamStatus, streamingContent }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages, streamingContent]);

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-950">
        <div className="text-center text-gray-500">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p className="text-lg">Select a chat or start a new conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-950">
      <div className="border-b border-gray-800 p-4 bg-gray-900">
        <h2 className="text-lg font-semibold text-white">{chat.title}</h2>
        <p className="text-sm text-gray-500">
          {new Date(chat.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chat.messages.length === 0 && !streamingContent ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {chat.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-100'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}

            {/* Streaming message */}
            {streamStatus === 'streaming' && (
              <div className="flex justify-start">
                <div className="max-w-[70%] rounded-lg px-4 py-2 bg-gray-800 text-gray-100">
                  {streamingContent ? (
                    <>
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {streamingContent}
                      </div>
                      <div className="flex items-center gap-2 text-xs mt-2 text-blue-400">
                        <div className="flex gap-1">
                          <span className="animate-pulse">●</span>
                          <span className="animate-pulse delay-75">●</span>
                          <span className="animate-pulse delay-150">●</span>
                        </div>
                        <span>Streaming...</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="flex gap-1">
                        <span className="animate-bounce">●</span>
                        <span className="animate-bounce delay-75">●</span>
                        <span className="animate-bounce delay-150">●</span>
                      </div>
                      <span>Typing...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stream complete indicator */}
            {streamStatus === 'complete' && (
              <div className="text-center">
                <span className="text-xs text-green-500">✓ Response complete</span>
              </div>
            )}

            {/* Stream error indicator */}
            {streamStatus === 'error' && (
              <div className="text-center">
                <span className="text-xs text-red-500">✗ Error receiving response</span>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
