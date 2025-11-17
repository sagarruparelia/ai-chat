# Quick Start Guide

Get your AI chatbot up and running in 5 minutes!

---

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Modern web browser (Chrome, Firefox, Safari, Edge)

---

## Installation

```bash
# 1. Install dependencies (already done if you built)
npm install

# 2. (Optional) Configure chat service URL
# If you have a real chat API:
echo "CHAT_SERVICE_URL=https://your-api.com/v1/chat" > .env.local

# If not configured, app will use mock responses for testing
```

---

## Running the App

### Development Mode

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

### Production Mode

```bash
# Build for production
npm run build

# Start production server
npm start
```

---

## First-Time Usage

### 1. Allow Location Access

When you first open the app:
- Browser will prompt for location permission
- **Click "Allow"** to enable messaging
- You'll see a green "✓ Location enabled" indicator

**If you clicked "Block":**
- Red error indicator appears
- Click the "Retry" button
- Allow location when prompted again

### 2. Create Your First Chat

1. Click the **"+ New Chat"** button in the sidebar
2. A new empty chat appears
3. The chat becomes active automatically

### 3. Send a Message

1. Type your message in the input field at the bottom
2. Click **"Send"** or press **Enter**
3. Watch the magic happen:
   - Your message appears instantly
   - "Typing..." indicator shows
   - AI response streams in word-by-word
   - "Streaming..." indicator during response
   - "✓ Response complete" when done

### 4. Create Multiple Chats

- Click "New Chat" anytime to start a new conversation
- Switch between chats by clicking them in the sidebar
- Each chat maintains its own message history

### 5. Delete a Chat

- Hover over a chat in the sidebar
- Click the **trash icon** that appears
- Chat is deleted immediately

---

## Understanding the UI

### Top Right Status Bar

**Session Indicator:**
```
Session: abc12345...
```
Shows first 8 characters of your unique session ID.

**Location Status:**
- 🟡 **"Getting location..."** - Requesting permission
- 🟢 **"✓ Location enabled"** - Ready to chat
- 🔴 **"Location error"** - Click retry button

### Message Input States

The input field shows different messages when disabled:

- **"Select a chat to send messages"** - No chat selected
- **"Please wait for response..."** - AI is responding
- **"Location required - enable location access"** - No location
- **"Type your message..."** - Ready to send!

### Streaming Indicators

**While waiting for response:**
```
● ● ●  Typing...
```
Animated bounce effect

**While receiving response:**
```
● ● ●  Streaming...
```
Animated pulse effect with partial message visible

**When complete:**
```
✓ Response complete
```
Shows for 2 seconds then disappears

---

## Testing Without Real API

### Using Mock Responses

If you haven't configured `CHAT_SERVICE_URL`, the app automatically uses mock streaming responses:

**Mock Response Format:**
```
I received your message: "Hello"

Location: 37.7749, -122.4194

This is a mock streaming response for testing.
Configure CHAT_SERVICE_URL environment variable to
connect to your real chat API.
```

**Benefits:**
- ✅ Test the entire UI flow
- ✅ See streaming in action
- ✅ Verify location is captured
- ✅ No backend required

### Mock Response Features

- Streams word-by-word (100ms delay per word)
- Includes your message echo
- Shows latitude and longitude
- Explains it's a test response

---

## Connecting to Real Chat API

### 1. Configure Environment Variable

Create `.env.local` file:
```bash
CHAT_SERVICE_URL=https://abc.com/your-service/v1/chat
```

### 2. Restart Development Server

```bash
# Stop server (Ctrl+C)
# Start again
npm run dev
```

### 3. Expected API Format

Your chat API should:

**Accept:** POST request
```json
{
  "session_id": "abc123...",
  "prompt": "User message",
  "lat": 37.7749,
  "lng": -122.4194
}
```

**Return:** Server-Sent Events stream
```
Content-Type: text/event-stream; charset=utf-8

data: First chunk of response
data: More response text
data: Final piece
data: [DONE]
```

### 4. Test Real API

1. Send a message
2. Response streams from your API
3. Check browser console for any errors

---

## Common Issues & Solutions

### Issue: Location Not Working

**Symptoms:**
- Red "Location error" indicator
- Cannot send messages

**Solutions:**
1. Click the "Retry" button
2. Check browser permissions (Settings → Site Settings → Location)
3. Ensure you're using HTTPS in production (Safari requirement)
4. Try different browser

### Issue: Messages Not Sending

**Check:**
- ✅ Chat selected? (highlight in sidebar)
- ✅ Location enabled? (green indicator)
- ✅ Not currently streaming? (input not disabled)
- ✅ Message not empty? (spaces don't count)

### Issue: Streaming Not Working

**Symptoms:**
- Message sent but no response
- Console errors about fetch

**Solutions:**
1. Check `CHAT_SERVICE_URL` is correct
2. Verify API is accessible (test with curl/Postman)
3. Check API returns `text/event-stream` content type
4. Look for CORS errors in console
5. If testing, mock fallback should work automatically

### Issue: Session Lost After Refresh

**This is normal!** Sessions persist via cookies.

**If sessions don't persist:**
- Check cookies enabled in browser
- Look for cookie settings blocking third-party cookies
- Verify you're on same domain/port
- Check browser's developer tools → Application → Cookies

---

## Keyboard Shortcuts

- **Enter** in input field → Send message
- **Escape** while streaming → (Not implemented - future feature)

---

## Developer Tools

### Check Session

Open browser console:
```javascript
// View cookies
document.cookie

// Check session ID in UI
// Look at top-right corner: "Session: abc12345..."
```

### Monitor Network

1. Open DevTools (F12)
2. Go to **Network** tab
3. Filter by "messages"
4. Send a message
5. Watch SSE stream in real-time

### Debug Location

```javascript
// Check geolocation support
navigator.geolocation ? "Supported" : "Not supported"

// Request location manually
navigator.geolocation.getCurrentPosition(
  pos => console.log(pos.coords),
  err => console.error(err)
);
```

---

## API Endpoints

For reference or testing with curl/Postman:

### Initialize Session
```bash
curl -X POST http://localhost:3000/api/auth/init \
  -H "Content-Type: application/json"
```

### Get Chats
```bash
curl http://localhost:3000/api/chats \
  -H "Cookie: ai-chat-user-id=...; ai-chat-session-id=..."
```

### Create Chat
```bash
curl -X POST http://localhost:3000/api/chats \
  -H "Content-Type: application/json" \
  -H "Cookie: ai-chat-user-id=...; ai-chat-session-id=..." \
  -d '{"title":"My Chat"}'
```

### Send Message (Streaming)
```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -H "Cookie: ai-chat-user-id=...; ai-chat-session-id=..." \
  -d '{
    "chatId":"chat-id-here",
    "content":"Hello!",
    "lat":37.7749,
    "lng":-122.4194
  }'
```

---

## Tips & Tricks

### Tip 1: Test Streaming Animation
- Send short messages to see streaming more clearly
- Mock responses have 100ms delay per word
- Real API speed depends on service

### Tip 2: Monitor Console
- Keep DevTools console open during development
- Warnings about mock responses are normal
- Errors are logged with context

### Tip 3: Session Persistence
- Same browser + IP = same session
- Cookies last 30 days
- Clear cookies to reset session

### Tip 4: Location Caching
- Location cached for 5 minutes
- Reduces battery usage
- Improves performance

### Tip 5: Multiple Browsers
- Each browser gets different session
- Test multi-user scenarios locally
- Use incognito for fresh sessions

---

## What's Next?

### Immediate
1. ✅ Test the mock responses
2. ✅ Explore the UI
3. ✅ Create multiple chats
4. ✅ Check location indicators

### Soon
1. Configure real chat API
2. Deploy to production
3. Share with users
4. Collect feedback

### Later
1. Add database for persistence
2. Implement user authentication
3. Add more features (file upload, search, etc.)
4. Scale to multiple servers

---

## Need Help?

### Documentation
- **CHATBOT_README.md** - Full feature documentation
- **STREAMING_FEATURES.md** - Streaming & geolocation details
- **VERIFICATION_REPORT.md** - Technical verification details
- **IMPLEMENTATION_SUMMARY.md** - Complete overview

### Debugging
1. Check browser console for errors
2. Verify environment variables
3. Test API with curl/Postman
4. Check CORS settings
5. Review server logs

---

## Quick Reference

| Action | Command |
|--------|---------|
| Install | `npm install` |
| Dev Server | `npm run dev` |
| Build | `npm run build` |
| Production | `npm start` |
| Lint | `npm run lint` |

| Feature | Status |
|---------|--------|
| Session Management | ✅ Working |
| Geolocation | ✅ Working |
| Streaming | ✅ Working |
| Multiple Chats | ✅ Working |
| Mock Fallback | ✅ Working |

---

**Ready to chat!** 🚀

Visit **http://localhost:3000** and start your first conversation!
