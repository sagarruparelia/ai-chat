'use client';

import { useChat } from '@ce-ai/hooks/useChat';
import { useGeolocation } from '@ce-ai/hooks/useGeolocation';
import { ChatList } from '@ce-ai/components/ChatList';
import { ChatWindow } from '@ce-ai/components/ChatWindow';
import { MessageInput } from '@ce-ai/components/MessageInput';

export default function Home() {
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
  } = useChat();

  const {
    coordinates,
    loading: geoLoading,
    error: geoError,
    hasPermission,
    requestLocation,
  } = useGeolocation();

  const handleNewChat = async () => {
    await createChat();
  };

  const handleSendMessage = async (content: string) => {
    if (currentChat) {
      if (!coordinates) {
        alert('Location is required to send messages. Please enable location access.');
        requestLocation();
        return;
      }
      await sendMessage(currentChat.id, content, coordinates.lat, coordinates.lng);
    }
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
    <div className="flex h-screen bg-gray-950 text-white">
      <ChatList
        chats={chats}
        currentChatId={currentChat?.id || null}
        onSelectChat={setCurrentChat}
        onDeleteChat={deleteChat}
        onNewChat={handleNewChat}
      />
      <div className="flex-1 flex flex-col">
        <ChatWindow
          chat={currentChat}
          streamStatus={streamStatus}
          streamingContent={streamingContent}
        />
        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={!currentChat || streamStatus === 'streaming' || !coordinates}
          disabledMessage={
            !currentChat
              ? 'Select a chat to send messages'
              : streamStatus === 'streaming'
              ? 'Please wait for response...'
              : !coordinates
              ? 'Location required - enable location access'
              : undefined
          }
        />
      </div>

      {/* Status indicators */}
      <div className="absolute top-4 right-4 space-y-2">
        {user && (
          <div className="text-xs text-gray-500 bg-gray-900 px-3 py-1 rounded-lg">
            Session: {user.sessionId.substring(0, 8)}...
          </div>
        )}

        {/* Geolocation status */}
        {geoLoading && (
          <div className="text-xs text-yellow-500 bg-gray-900 px-3 py-1 rounded-lg flex items-center gap-2">
            <div className="animate-spin rounded-full h-3 w-3 border-b border-yellow-500"></div>
            <span>Getting location...</span>
          </div>
        )}

        {geoError && (
          <div className="text-xs text-red-500 bg-gray-900 px-3 py-1 rounded-lg">
            <div className="flex items-center gap-2">
              <span>⚠</span>
              <span>Location error</span>
            </div>
            <button
              onClick={requestLocation}
              className="mt-1 text-blue-400 hover:text-blue-300 underline"
            >
              Retry
            </button>
          </div>
        )}

        {coordinates && !geoError && (
          <div className="text-xs text-green-500 bg-gray-900 px-3 py-1 rounded-lg">
            ✓ Location enabled
          </div>
        )}
      </div>
    </div>
  );
}
