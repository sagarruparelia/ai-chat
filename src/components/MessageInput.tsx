'use client';

import { useState, FormEvent } from 'react';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
  disabledMessage?: string;
}

export function MessageInput({ onSendMessage, disabled, disabledMessage }: MessageInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const placeholder = disabled
    ? (disabledMessage || 'Cannot send messages')
    : 'Type your message...';

  return (
    <div className="border-t border-gray-300 dark:border-gray-700 p-3 md:p-4 bg-gray-100 dark:bg-gray-900 flex-shrink-0">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 md:px-4 text-sm md:text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed placeholder-gray-400 dark:placeholder-gray-500 shadow-sm"
        />
        <button
          type="submit"
          disabled={disabled || !message.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 md:px-6 text-sm md:text-base rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg font-medium"
        >
          Send
        </button>
      </form>
    </div>
  );
}
