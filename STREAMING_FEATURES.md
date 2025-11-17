# Streaming Chat Features

This document describes the streaming chat integration and geolocation features added to the chatbot.

## Features Overview

### 1. Real-Time Streaming Responses
- **Server-Sent Events (SSE)** for streaming AI responses
- **Live typing indicators** while AI is generating response
- **Progressive message display** - text appears as it's generated
- **Status indicators** for stream states (streaming, complete, error)

### 2. Geolocation Support
- **Automatic location request** on page load
- **Browser geolocation API** integration
- **Location permission handling** with retry mechanism
- **Visual status indicators** for location state
- **Location required** to send messages (enforced)

### 3. External Chat API Integration
- Calls external chat service at: `abc.com/<chat-service>/v1/chat`
- Sends session ID, prompt, latitude, and longitude
- Handles streaming response in `text/event-stream` format
- Proxies stream through Next.js API route

## API Integration

### Chat Service Endpoint

**URL:** `https://abc.com/<chat-service>/v1/chat` (configurable via env variable)

**Method:** POST

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "session_id": "<unique-string-session-id>",
  "prompt": "<user-message>",
  "lat": 37.7749,
  "lng": -122.4194
}
```

**Response:**
```
Content-Type: text/event-stream; charset=utf-8

data: chunk of response text
data: more response text
data: [DONE]
```

### Configuration

1. **Set Environment Variable:**
   ```bash
   # .env.local
   CHAT_SERVICE_URL=https://abc.com/your-chat-service/v1/chat
   ```

2. **Or use default:**
   The default URL is configured in `/src/app/api/messages/route.ts`:
   ```typescript
   const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL || 'https://abc.com/<chat-service>/v1/chat';
   ```

## How It Works

### Message Flow

1. **User sends message:**
   - User types message and clicks "Send"
   - App checks if geolocation is available
   - If no location, prompts user to enable location access

2. **Request to API:**
   - Message sent to `/api/messages` with:
     - `chatId`: Current chat ID
     - `content`: User's message
     - `lat`: Latitude
     - `lng`: Longitude

3. **API proxies to chat service:**
   - Next.js API route calls external chat service
   - Includes `session_id`, `prompt`, `lat`, `lng`
   - Receives streaming response

4. **Stream events forwarded to client:**
   - `user_message`: User's message added to chat
   - `stream_start`: Streaming begins
   - `chunk`: Each piece of AI response
   - `stream_complete`: Full response received
   - `error`: If stream fails

5. **UI updates in real-time:**
   - User message appears immediately
   - "Typing..." indicator shows while waiting
   - AI response appears word-by-word as streaming
   - "Streaming..." indicator while receiving chunks
   - "Response complete" when done

### Geolocation Flow

1. **Page loads:**
   - `useGeolocation` hook activates
   - Browser requests location permission

2. **User grants permission:**
   - Coordinates stored in state
   - Green "Location enabled" indicator appears
   - User can send messages

3. **User denies permission:**
   - Red error indicator appears
   - "Retry" button available
   - Messages cannot be sent until location granted

4. **Location unavailable:**
   - Appropriate error message shown
   - User can retry
   - Fallback options available

## UI States

### Stream Status Indicators

**Idle:**
- No streaming in progress
- Input enabled (if location available)

**Typing...:**
- Waiting for first chunk from API
- Shows animated dots
- Input disabled

**Streaming...:**
- Receiving chunks from API
- Shows partial response with animated indicator
- Input disabled

**Complete:**
- Full response received
- Shows checkmark "✓ Response complete"
- Fades after 2 seconds
- Input re-enabled

**Error:**
- Stream failed
- Shows "✗ Error receiving response"
- Input re-enabled
- User can retry

### Location Status Indicators

**Getting location...:**
- Yellow indicator with spinner
- Initial permission request

**Location enabled:**
- Green indicator with checkmark
- User can send messages

**Location error:**
- Red indicator with warning icon
- Shows "Retry" button
- Messages disabled

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── messages/route.ts       # Streaming API endpoint
│   └── page.tsx                    # Main page with geolocation
├── components/
│   ├── ChatWindow.tsx              # Shows streaming messages
│   └── MessageInput.tsx            # Message input (unchanged)
├── hooks/
│   ├── useChat.ts                  # Streaming & message handling
│   └── useGeolocation.ts           # Geolocation hook
├── lib/
│   └── chatService.ts              # Chat API client utilities
└── types/
    └── chat.ts                     # StreamStatus and other types
```

## Key Components

### useGeolocation Hook

Manages browser geolocation:
- Requests location permission
- Caches coordinates for 5 minutes
- Handles errors gracefully
- Provides retry mechanism

```typescript
const {
  coordinates,      // { lat: number, lng: number } | null
  loading,          // boolean
  error,            // string | null
  hasPermission,    // boolean
  requestLocation,  // () => void - retry function
} = useGeolocation();
```

### useChat Hook (Enhanced)

Now includes streaming support:
```typescript
const {
  // ... existing chat state
  streamStatus,       // 'idle' | 'streaming' | 'complete' | 'error'
  streamingContent,   // string - accumulated stream content
  sendMessage,        // Now accepts lat & lng parameters
  cancelStream,       // () => void - cancel ongoing stream
} = useChat();
```

### ChatWindow Component (Enhanced)

Displays streaming messages:
```typescript
<ChatWindow
  chat={currentChat}
  streamStatus={streamStatus}
  streamingContent={streamingContent}
/>
```

Features:
- Shows regular messages
- Shows streaming message with animation
- Displays status indicators
- Auto-scrolls as content streams

## Testing the Integration

### 1. Without Real Chat Service (Testing Mode)

The API route will fail to connect to the external service if not configured. You'll see errors in the console, but the rest of the app works.

### 2. With Real Chat Service

1. Set environment variable:
   ```bash
   echo "CHAT_SERVICE_URL=https://your-actual-url.com/v1/chat" > .env.local
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Open browser and allow location access

4. Create new chat and send message

5. Watch streaming response appear in real-time

### 3. Test Geolocation

**Allow location:**
- Green indicator appears
- Can send messages

**Block location:**
- Red error indicator
- Cannot send messages
- Click "Retry" to re-request

**No geolocation support:**
- Shows error message
- Graceful degradation

## Error Handling

### Stream Errors
- Network failures
- API timeouts
- Invalid responses
- Connection drops

All handled gracefully with error indicators and retry options.

### Location Errors
- Permission denied
- Position unavailable
- Timeout

All shown to user with retry mechanism.

## Performance Optimizations

1. **Debounced streaming updates** - Chunks batched for smooth rendering
2. **Cached geolocation** - Location stored for 5 minutes
3. **Abort controllers** - Streams can be cancelled
4. **Memory efficient** - Streaming doesn't load full response into memory first

## Security Considerations

1. **HTTPS required** for geolocation in production
2. **Location data** sent securely to API
3. **Session validation** before sending messages
4. **CORS configured** for API requests
5. **Stream size limits** to prevent memory issues

## Browser Compatibility

- **Chrome/Edge:** Full support
- **Firefox:** Full support
- **Safari:** Full support (requires HTTPS for geolocation)
- **Mobile browsers:** Full support (with permission prompts)

## Future Enhancements

1. **Location caching** - Store location in localStorage
2. **Manual location entry** - Allow users to input coordinates
3. **Location history** - Track location changes
4. **Stream resumption** - Resume interrupted streams
5. **Typing indicators** - Show when AI is "thinking"
6. **Read receipts** - Mark messages as read
7. **Message reactions** - React to specific messages

## Troubleshooting

### Stream not working
- Check CHAT_SERVICE_URL environment variable
- Verify external API is accessible
- Check browser console for errors
- Ensure API returns SSE format

### Location not working
- Enable HTTPS in production
- Check browser permissions
- Verify geolocation API support
- Clear browser cache and retry

### Messages not sending
- Ensure location is enabled
- Check session is initialized
- Verify chat is selected
- Check network connection

## Environment Variables

```bash
# Required for streaming chat
CHAT_SERVICE_URL=https://abc.com/<chat-service>/v1/chat

# Optional
NODE_ENV=production
```

Create `.env.local` file in project root with your configuration.
