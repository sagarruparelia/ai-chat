import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { storage } from '@ce-ai/lib/storage';
import { ApiResponse, CreateChatRequest } from '@ce-ai/types/chat';

const USER_COOKIE_NAME = 'ai-chat-user-id';
const SESSION_COOKIE_NAME = 'ai-chat-session-id';

// Get all chats for the current user
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    const userId = cookieStore.get(USER_COOKIE_NAME)?.value;
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!userId || !sessionId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Get user's chats
    const chats = storage.getChatsByUserId(userId);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { chats },
    });
  } catch (error) {
    console.error('Error getting chats:', error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: 'Failed to get chats',
      },
      { status: 500 }
    );
  }
}

// Create a new chat
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    const userId = cookieStore.get(USER_COOKIE_NAME)?.value;
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!userId || !sessionId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const body: CreateChatRequest = await request.json();

    // Create new chat
    const chat = storage.createChat(userId, sessionId, body.title);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { chat },
    });
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: 'Failed to create chat',
      },
      { status: 500 }
    );
  }
}
