import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { storage } from '@ce-ai/lib/storage';
import { ApiResponse } from '@ce-ai/types/chat';

const USER_COOKIE_NAME = 'ai-chat-user-id';

// Get a specific chat
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get(USER_COOKIE_NAME)?.value;

    if (!userId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const { chatId } = await params;
    const chat = storage.getChatById(chatId);

    if (!chat) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Chat not found',
        },
        { status: 404 }
      );
    }

    // Verify chat belongs to user
    if (chat.userId !== userId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Forbidden',
        },
        { status: 403 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { chat },
    });
  } catch (error) {
    console.error('Error getting chat:', error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: 'Failed to get chat',
      },
      { status: 500 }
    );
  }
}

// Delete a chat
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get(USER_COOKIE_NAME)?.value;

    if (!userId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const { chatId } = await params;
    const chat = storage.getChatById(chatId);

    if (!chat) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Chat not found',
        },
        { status: 404 }
      );
    }

    // Verify chat belongs to user
    if (chat.userId !== userId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Forbidden',
        },
        { status: 403 }
      );
    }

    storage.deleteChat(chatId);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { message: 'Chat deleted successfully' },
    });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: 'Failed to delete chat',
      },
      { status: 500 }
    );
  }
}
