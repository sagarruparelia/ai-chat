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
    <div className="border-t border-gray-800 p-3 md:p-4 bg-gray-900 flex-shrink-0">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 md:px-4 text-sm md:text-base focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={disabled || !message.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 md:px-6 text-sm md:text-base rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
}
