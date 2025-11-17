This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## AI Chat Application

A real-time chat application with location-based features and streaming AI responses.

### Features

- Real-time streaming chat responses
- Location-based messaging (requires geolocation permission)
- Session-based user management
- Mobile-responsive design with sidebar toggle
- Mock service mode for testing without external API

## Getting Started

### Development Server

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Chat Service Configuration

By default, the application runs in **mock mode** and doesn't require any external chat API. This is perfect for testing and development.

#### Using Mock Mode (Default)

No configuration needed! The app will automatically use a mock streaming service that echoes your messages.

#### Connecting to a Real Chat API

To connect to your own chat service:

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and set your chat service URL:
   ```bash
   CHAT_SERVICE_URL=https://your-domain.com/api/chat
   ```

3. Restart the development server

**Chat API Requirements:**
- Method: `POST`
- Request body: `{ session_id: string, prompt: string, lat: number, lng: number }`
- Response: Server-Sent Events (SSE) stream with `data: <content>` format
- End marker: `data: [DONE]`

### Location Permission

The app requires geolocation access to send messages. When you first load the app, your browser will prompt you to allow location access.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
