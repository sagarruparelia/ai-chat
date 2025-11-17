'use client';

import { Chat } from '@ce-ai/types/chat';

interface ChatListProps {
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (chat: Chat) => void;
  onDeleteChat: (chatId: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatList({
  chats,
  currentChatId,
  onSelectChat,
  onDeleteChat,
  onNewChat,
  isOpen,
  onClose,
}: ChatListProps) {
  return (
    <div
      className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-gray-100 dark:bg-gray-900 border-r border-gray-300 dark:border-gray-800 flex flex-col
        transform transition-transform duration-300 ease-in-out
        h-screen overflow-hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      <div className="p-4 border-b border-gray-300 dark:border-gray-700 flex-shrink-0">
        <button
          onClick={onNewChat}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg font-medium"
        >
          + New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {chats.length === 0 ? (
          <div className="p-4 text-gray-600 dark:text-gray-400 text-sm text-center">
            No chats yet. Start a new conversation!
          </div>
        ) : (
          <div className="p-2">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`group relative p-3 mb-2 rounded-lg cursor-pointer transition-all ${
                  currentChatId === chat.id
                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-400 dark:border-gray-600 shadow-md'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-800/70 text-gray-800 dark:text-gray-200 border border-transparent'
                }`}
                onClick={() => onSelectChat(chat)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-sm">
                      {chat.title}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {chat.messages.length} messages
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 ml-2 text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all"
                    aria-label="Delete chat"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
