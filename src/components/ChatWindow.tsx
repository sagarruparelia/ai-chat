'use client';

import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

  // Convert literal \n to actual newlines for proper markdown rendering
  const processContent = (content: string): string => {
    return content.replace(/\\n/g, '\n');
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages, streamingContent]);

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-950 p-4">
        <div className="text-center text-gray-500 max-w-md">
          <svg
            className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-gray-700"
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
          <p className="text-base md:text-lg mb-2">Ready to start chatting!</p>
          <p className="text-xs md:text-sm text-gray-600">Type your message below to begin a new conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-950 min-h-0 overflow-hidden">
      <div className="border-b border-gray-700 p-3 md:p-4 bg-gray-900 flex-shrink-0">
        <h2 className="text-base md:text-lg font-semibold text-white truncate">{chat.title}</h2>
        <p className="text-xs md:text-sm text-gray-400">
          {new Date(chat.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-4 space-y-3 md:space-y-4">
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
                  className={`max-w-[85%] sm:max-w-[75%] lg:max-w-[70%] rounded-lg px-3 py-2 md:px-4 shadow-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 border border-slate-600'
                  }`}
                >
                  <div className={`text-xs sm:text-sm prose max-w-none ${
                    message.role === 'user' ? 'prose-invert' : 'prose-slate'
                  }`}>
                    <div className="text-white">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {processContent(message.content)}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <div
                    className={`text-[10px] sm:text-xs mt-1 ${
                      message.role === 'user' ? 'text-blue-200' : 'text-slate-300'
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
                <div className="max-w-[85%] sm:max-w-[75%] lg:max-w-[70%] rounded-lg px-3 py-2 md:px-4 bg-slate-700 border border-slate-600 shadow-lg">
                  {streamingContent ? (
                    <>
                      <div className="text-xs sm:text-sm prose prose-slate max-w-none">
                        <div className="text-white">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {processContent(streamingContent)}
                          </ReactMarkdown>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 md:gap-2 text-[10px] sm:text-xs mt-2 text-blue-400">
                        <div className="flex gap-1">
                          <span className="animate-pulse">●</span>
                          <span className="animate-pulse delay-75">●</span>
                          <span className="animate-pulse delay-150">●</span>
                        </div>
                        <span>Streaming...</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1 md:gap-2 text-[10px] sm:text-xs text-slate-300">
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
