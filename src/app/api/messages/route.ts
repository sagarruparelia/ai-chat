import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { storage } from '@ce-ai/lib/storage';
import { SendMessageRequest } from '@ce-ai/types/chat';

const USER_COOKIE_NAME = 'ai-chat-user-id';
const SESSION_COOKIE_NAME = 'ai-chat-session-id';

// Configure your chat service endpoint here
const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL;
const USE_MOCK_SERVICE = !CHAT_SERVICE_URL || CHAT_SERVICE_URL.includes('abc.com');

// Helper function to remove surrounding quotes from content
function stripQuotes(content: string): string {
  const trimmed = content.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return content;
}

// Send a message to a chat with streaming response
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get(USER_COOKIE_NAME)?.value;
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!userId || !sessionId) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body: SendMessageRequest = await request.json();
    const { chatId, content, lat, lng } = body;

    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Message content is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (lat === undefined || lng === undefined) {
      return new Response(
        JSON.stringify({ success: false, error: 'Location (lat, lng) is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const chat = storage.getChatById(chatId);

    if (!chat) {
      return new Response(
        JSON.stringify({ success: false, error: 'Chat not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify chat belongs to user
    if (chat.userId !== userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Add user message
    const userMessage = storage.addMessage(chatId, 'user', content);

    if (!userMessage) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to add message' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create a ReadableStream for Server-Sent Events
    const encoder = new TextEncoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial user message event
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'user_message', data: userMessage })}\n\n`)
          );

          // Call the external chat service or use mock
          let chatResponse: Response;

          if (USE_MOCK_SERVICE) {
            // Use mock streaming response for testing
            console.log('Using mock chat service (configure CHAT_SERVICE_URL to use real service)');

            const mockResponse = `I received your message: "${content}"\n\nLocation: ${lat.toFixed(4)}, ${lng.toFixed(4)}\n\nThis is a mock streaming response for testing. Configure CHAT_SERVICE_URL environment variable to connect to your real chat API.`;

            const mockStream = new ReadableStream({
              start(controller) {
                const words = mockResponse.split(' ');
                let index = 0;

                const interval = setInterval(() => {
                  if (index < words.length) {
                    const chunk = (index === 0 ? '' : ' ') + words[index];
                    controller.enqueue(new TextEncoder().encode(`data: ${chunk}\n\n`));
                    index++;
                  } else {
                    controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                    controller.close();
                    clearInterval(interval);
                  }
                }, 100);
              },
            });

            chatResponse = new Response(mockStream, {
              headers: { 'Content-Type': 'text/event-stream' },
            });
          } else {
            // Call real chat service
            try {
              chatResponse = await fetch(CHAT_SERVICE_URL!, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  session_id: chatId, // Use chatId as session_id (each chat is its own session)
                  prompt: content,
                  lat,
                  lng,
                }),
              });

              if (!chatResponse.ok) {
                throw new Error(`Chat service error: ${chatResponse.status}`);
              }

              if (!chatResponse.body) {
                throw new Error('No response body from chat service');
              }
            } catch (fetchError) {
              // Log error and throw to be handled by outer catch
              console.error('Chat service error:', fetchError);
              throw new Error('Failed to connect to chat service');
            }
          }

          if (!chatResponse.body) {
            throw new Error('No response body available');
          }

          const reader = chatResponse.body.getReader();
          const decoder = new TextDecoder();

          // Signal streaming has started
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'stream_start' })}\n\n`)
          );

          // Read and forward the stream
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              // Stream complete - save the full response
              const assistantMessage = storage.addMessage(chatId, 'assistant', fullResponse);

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'stream_complete', data: assistantMessage })}\n\n`
                )
              );
              controller.close();
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            // Process SSE format: extract content from "data: <content>" lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                let content = line.slice(6); // Remove "data: " prefix

                // Skip [DONE] marker or empty lines
                if (content === '[DONE]' || content.trim() === '') {
                  continue;
                }

                // Remove surrounding quotes if present
                content = stripQuotes(content);

                // Accumulate the actual content
                fullResponse += content;

                // Forward content chunk to client
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'chunk', data: content })}\n\n`)
                );
              }
            }
          }
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', error: 'Failed to stream response' })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to send message' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
