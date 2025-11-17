import { ChatServiceRequest } from '@ce-ai/types/chat';

// Configure your chat service endpoint here
const CHAT_SERVICE_URL = process.env.NEXT_PUBLIC_CHAT_SERVICE_URL || 'https://abc.com/<chat-service>/v1/chat';

export interface StreamCallbacks {
  onStart?: () => void;
  onChunk: (chunk: string) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Calls the streaming chat API and handles Server-Sent Events
 */
export async function streamChatResponse(
  request: ChatServiceRequest,
  callbacks: StreamCallbacks
): Promise<void> {
  const { onStart, onChunk, onComplete, onError } = callbacks;

  try {
    // Notify streaming has started
    onStart?.();

    const response = await fetch(CHAT_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Stream complete
        onComplete?.();
        break;
      }

      // Decode the chunk
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Process Server-Sent Events
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();

          // Skip empty data or [DONE] markers
          if (data === '' || data === '[DONE]') {
            continue;
          }

          try {
            // Try to parse as JSON (some SSE implementations send JSON)
            const parsed = JSON.parse(data);
            const content = parsed.content || parsed.text || parsed.delta || data;
            onChunk(content);
          } catch {
            // If not JSON, treat as plain text
            onChunk(data);
          }
        } else if (line.trim() !== '') {
          // Handle non-SSE format (plain text streaming)
          onChunk(line);
        }
      }
    }
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error('Unknown error'));
  }
}

/**
 * Alternative implementation using EventSource for standard SSE
 * Use this if the API strictly follows SSE format
 */
export function streamChatResponseWithEventSource(
  request: ChatServiceRequest,
  callbacks: StreamCallbacks
): () => void {
  const { onStart, onChunk, onComplete, onError } = callbacks;

  // Create URL with query parameters (if needed)
  const url = new URL(CHAT_SERVICE_URL);

  // Note: EventSource doesn't support POST, so this is for GET-based SSE
  // For POST-based SSE, use the fetch implementation above
  const eventSource = new EventSource(url.toString());

  onStart?.();

  eventSource.onmessage = (event) => {
    const data = event.data;

    if (data === '[DONE]') {
      eventSource.close();
      onComplete?.();
      return;
    }

    try {
      const parsed = JSON.parse(data);
      const content = parsed.content || parsed.text || parsed.delta || data;
      onChunk(content);
    } catch {
      onChunk(data);
    }
  };

  eventSource.onerror = (error) => {
    eventSource.close();
    onError?.(new Error('EventSource error'));
  };

  // Return cleanup function
  return () => {
    eventSource.close();
  };
}
