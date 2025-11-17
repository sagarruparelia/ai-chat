# AI Chat Application

A Next.js-based chatbot application with session management, cookie-based user identification, and in-memory storage.

## Features

### 1. Cookie-Based User Identification
- Automatically creates a cookie when a user visits the site
- Cookie stores both `user-id` and `session-id`
- Cookies are HTTP-only and secure (in production)
- 30-day expiration period

### 2. Session Management
- **Unique Session ID Generation**: Based on browser fingerprint + IP address + timestamp + UUID
- **Browser Fingerprint**: Created from User-Agent and IP address (MD5 hash)
- **Session Tracking**: Each session is tightly bound to:
  - Browser User-Agent
  - IP Address
  - Session expiration date

### 3. Chat Management
- **Multiple Chats**: Users can create multiple chat conversations
- **Chat Persistence**: All chats are bound to the session ID
- **Automatic Titles**: First user message becomes the chat title
- **Delete Chats**: Users can delete individual conversations

### 4. In-Memory Storage
- No database required - everything stored in server memory
- Storage includes:
  - Users (with session IDs)
  - Sessions (with browser fingerprints and IP addresses)
  - Chats (with messages)
  - Message history per chat

**Note**: Data will reset when server restarts. For production, consider Redis or a database.

## Architecture

### File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/init/route.ts      # User session initialization
│   │   ├── chats/
│   │   │   ├── route.ts            # Create/list chats
│   │   │   └── [chatId]/route.ts   # Get/delete specific chat
│   │   └── messages/route.ts       # Send messages
│   ├── layout.tsx
│   ├── page.tsx                    # Main chat interface
│   └── globals.css
├── components/
│   ├── ChatList.tsx                # Sidebar with chat list
│   ├── ChatWindow.tsx              # Message display area
│   └── MessageInput.tsx            # Message input field
├── hooks/
│   └── useChat.ts                  # React hook for chat operations
├── lib/
│   ├── session.ts                  # Session ID generation utilities
│   └── storage.ts                  # In-memory storage manager
└── types/
    └── chat.ts                     # TypeScript interfaces
```

### API Endpoints

#### POST /api/auth/init
- Initializes user session
- Creates cookies for user identification
- Generates unique session ID based on browser + IP
- Returns user and session data

#### GET /api/auth/init
- Retrieves current session information
- Validates session expiration
- Updates user activity timestamp

#### POST /api/chats
- Creates a new chat conversation
- Requires valid user session (cookie)
- Returns created chat object

#### GET /api/chats
- Lists all chats for the current user
- Sorted by last updated (newest first)

#### GET /api/chats/[chatId]
- Retrieves specific chat with all messages
- Validates chat ownership

#### DELETE /api/chats/[chatId]
- Deletes a chat conversation
- Validates chat ownership

#### POST /api/messages
- Sends a message to a chat
- Adds user message
- Generates AI response (placeholder implementation)
- Returns both user and assistant messages

## Session ID Generation Strategy

The session ID is generated using multiple factors for uniqueness:

1. **Browser Fingerprint**: MD5 hash of `User-Agent + IP Address`
2. **Timestamp**: Current timestamp in milliseconds
3. **Random UUID**: Cryptographically random UUID v4
4. **Final Hash**: SHA-256 hash of combined data

```typescript
fingerprint = md5(userAgent + ipAddress)
sessionData = fingerprint + timestamp + uuid
sessionId = sha256(sessionData)
```

This ensures:
- Same browser + IP combination can be identified
- Multiple sessions from same browser/IP are still unique
- Session IDs are cryptographically secure

## How It Works

### User Flow

1. **User visits site**
   - POST request to `/api/auth/init`
   - Server generates session ID based on browser fingerprint + IP
   - Server creates user and session
   - Cookies are set (`ai-chat-user-id`, `ai-chat-session-id`)

2. **User creates new chat**
   - Click "New Chat" button
   - POST request to `/api/chats`
   - New chat created and bound to session ID

3. **User sends message**
   - Type message and click "Send"
   - POST request to `/api/messages`
   - User message added
   - AI response generated (placeholder)
   - Both messages returned and displayed

4. **User switches chats**
   - Click on chat in sidebar
   - Chat loaded from memory
   - All messages displayed

5. **User returns later**
   - Cookies automatically sent with requests
   - Session validated (not expired)
   - Previous chats loaded
   - Continue conversation

## Getting Started

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production
```bash
npm run build
npm start
```

## Technical Details

### Technologies Used
- **Next.js 16** with App Router
- **React 19** with Server Components
- **TypeScript** for type safety
- **Tailwind CSS v4** for styling
- **cookies-next** for cookie management
- **uuid** for unique ID generation

### Cookie Configuration
```typescript
{
  httpOnly: true,              // Not accessible via JavaScript
  secure: true,                // HTTPS only (production)
  sameSite: 'lax',            // CSRF protection
  maxAge: 60 * 60 * 24 * 30,  // 30 days
  path: '/',                   // Available site-wide
}
```

### Session Expiration
- Default: 30 days
- Configurable in `src/lib/session.ts`
- Expired sessions are not automatically cleaned (manual cleanup needed)

## Future Enhancements

1. **AI Integration**: Replace placeholder AI with OpenAI, Anthropic Claude, or other LLM APIs
2. **Database**: Add PostgreSQL/MongoDB for persistent storage
3. **Authentication**: Add OAuth or email/password authentication
4. **Real-time Updates**: WebSocket support for live message updates
5. **File Uploads**: Allow users to upload images/documents
6. **Export Chats**: Export conversation history as PDF/JSON
7. **Search**: Search through chat history
8. **User Profiles**: Allow users to customize their profile
9. **Rate Limiting**: Prevent abuse with rate limiting
10. **Session Cleanup**: Automated cleanup of expired sessions

## Security Considerations

- Session IDs are cryptographically secure (SHA-256)
- Cookies are HTTP-only (not accessible via JavaScript)
- HTTPS required in production
- No sensitive data stored in cookies
- Chat ownership validated on all operations
- IP addresses extracted from trusted headers (x-forwarded-for)

## Limitations

1. **Memory Storage**: All data lost on server restart
2. **No Persistence**: Users lose history if cookies are cleared
3. **No Real AI**: Uses placeholder responses (needs LLM integration)
4. **Single Server**: Not suitable for multi-server deployments without Redis
5. **No Auth**: Anyone with cookies can access chats

## Contributing

Feel free to submit issues and pull requests!

## License

MIT
