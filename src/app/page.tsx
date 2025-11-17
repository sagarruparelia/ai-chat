'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useChat } from '@ce-ai/hooks/useChat';
import { useGeolocation } from '@ce-ai/hooks/useGeolocation';
import { ChatList } from '@ce-ai/components/ChatList';
import { ChatWindow } from '@ce-ai/components/ChatWindow';
import { MessageInput } from '@ce-ai/components/MessageInput';
import { Chat } from '@ce-ai/types/chat';

function HomeContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatIdFromUrl = searchParams.get('chat');

  const {
    user,
    chats,
    currentChat,
    loading,
    error,
    streamStatus,
    streamingContent,
    createChat,
    sendMessage,
    deleteChat,
    setCurrentChat,
    loadChat,
  } = useChat();

  const {
    coordinates,
    loading: geoLoading,
    error: geoError,
    hasPermission,
    requestLocation,
    source: locationSource,
  } = useGeolocation();

  // Load chat from URL or set up new chat mode
  useEffect(() => {
    if (loading) return;

    if (chatIdFromUrl) {
      // Load chat from URL if it exists
      const chatExists = chats.find(c => c.id === chatIdFromUrl);
      if (chatExists) {
        setCurrentChat(chatExists);
      } else {
        // Chat ID in URL doesn't exist, redirect to home
        router.replace('/');
      }
    } else if (!currentChat && chats.length === 0) {
      // First time user - no chats exist and no chat in URL
      // Stay in "ready to chat" state (new chat mode)
      setCurrentChat(null);
    } else if (!currentChat && chats.length > 0 && !chatIdFromUrl) {
      // Has chats but no current chat and no URL - stay in new chat mode
      setCurrentChat(null);
    }
  }, [chatIdFromUrl, chats, loading]);

  // Update URL when current chat changes
  useEffect(() => {
    if (currentChat && chatIdFromUrl !== currentChat.id) {
      router.replace(`/?chat=${currentChat.id}`);
    } else if (!currentChat && chatIdFromUrl) {
      router.replace('/');
    }
  }, [currentChat, chatIdFromUrl]);

  const handleNewChat = () => {
    // Clear current chat and URL - enter new chat mode
    setCurrentChat(null);
    router.replace('/');
  };

  const handleSendMessage = async (content: string) => {
    // Wait for location if it's still loading
    if (geoLoading) {
      alert('Getting your location, please wait...');
      return;
    }

    if (!coordinates) {
      alert('Unable to get location. Please check your connection and try again.');
      requestLocation();
      return;
    }

    // If no current chat, create one first
    if (!currentChat) {
      const newChat = await createChat();
      if (!newChat) {
        alert('Failed to create chat. Please try again.');
        return;
      }
      // Send the message
      await sendMessage(newChat.id, content, coordinates.lat, coordinates.lng);
      // URL will be updated by the useEffect watching currentChat
    } else {
      await sendMessage(currentChat.id, content, coordinates.lat, coordinates.lng);
    }
  };

  const handleSelectChat = (chat: Chat) => {
    setCurrentChat(chat);
    setIsSidebarOpen(false);
    // URL will be updated by the useEffect watching currentChat
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Initializing session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="text-center text-red-500">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white relative overflow-hidden">
      {/* Hamburger Menu Button - Mobile Only */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-gray-800 p-2 rounded-lg hover:bg-gray-700 transition-colors"
        aria-label="Toggle menu"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isSidebarOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <ChatList
        chats={chats}
        currentChatId={currentChat?.id || null}
        onSelectChat={handleSelectChat}
        onDeleteChat={deleteChat}
        onNewChat={handleNewChat}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <ChatWindow
          chat={currentChat}
          streamStatus={streamStatus}
          streamingContent={streamingContent}
        />
        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={streamStatus === 'streaming' || geoLoading}
          disabledMessage={
            streamStatus === 'streaming'
              ? 'Please wait for response...'
              : geoLoading
              ? 'Getting location...'
              : undefined
          }
        />
      </div>

      {/* Status indicators */}
      <div className="fixed top-2 right-2 md:top-4 md:right-4 space-y-1 md:space-y-2 z-40 lg:absolute max-w-[calc(100vw-5rem)] md:max-w-none">
        {user && (
          <div className="text-[10px] md:text-xs text-gray-500 bg-gray-900 px-2 py-1 md:px-3 rounded-lg truncate">
            <span className="hidden sm:inline">Session: </span>
            {user.sessionId.substring(0, 8)}...
          </div>
        )}

        {/* Geolocation status */}
        {geoLoading && (
          <div className="text-[10px] md:text-xs text-yellow-500 bg-gray-900 px-2 py-1 md:px-3 rounded-lg flex items-center gap-1 md:gap-2">
            <div className="animate-spin rounded-full h-2 w-2 md:h-3 md:w-3 border-b border-yellow-500"></div>
            <span className="hidden sm:inline">Getting location...</span>
            <span className="sm:hidden">Location...</span>
          </div>
        )}

        {geoError && (
          <div className="text-[10px] md:text-xs text-red-500 bg-gray-900 px-2 py-1 md:px-3 rounded-lg">
            <div className="flex items-center gap-1 md:gap-2">
              <span>⚠</span>
              <span className="hidden sm:inline">Location error</span>
              <span className="sm:hidden">Error</span>
            </div>
            <button
              onClick={requestLocation}
              className="mt-1 text-blue-400 hover:text-blue-300 underline text-[10px] md:text-xs"
            >
              Retry
            </button>
          </div>
        )}

        {coordinates && !geoError && (
          <div className="text-[10px] md:text-xs text-green-500 bg-gray-900 px-2 py-1 md:px-3 rounded-lg">
            <span className="hidden sm:inline">
              ✓ Location {locationSource === 'browser' ? '(GPS)' : '(IP-based)'}
            </span>
            <span className="sm:hidden">✓</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-gray-950">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
