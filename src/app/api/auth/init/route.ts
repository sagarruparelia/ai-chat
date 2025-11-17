import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { storage } from '@ce-ai/lib/storage';
import {
  generateSessionId,
  getClientIp,
  getUserAgent,
  getSessionExpiration,
  createBrowserFingerprint,
} from '@ce-ai/lib/session';
import { ApiResponse } from '@ce-ai/types/chat';

const USER_COOKIE_NAME = 'ai-chat-user-id';
const SESSION_COOKIE_NAME = 'ai-chat-session-id';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const headers = request.headers;

    // Get browser fingerprint data
    const userAgent = getUserAgent(headers);
    const ipAddress = getClientIp(headers);
    const fingerprint = createBrowserFingerprint(userAgent, ipAddress);

    // Check for existing cookies
    const existingUserId = cookieStore.get(USER_COOKIE_NAME)?.value;
    const existingSessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    // If user exists and session is valid, return existing user
    if (existingUserId && existingSessionId) {
      const user = storage.getUserById(existingUserId);
      const session = storage.getSessionById(existingSessionId);

      if (user && session && new Date() < session.expiresAt) {
        // Update activity
        storage.updateUserActivity(existingUserId);

        return NextResponse.json<ApiResponse>({
          success: true,
          data: {
            user,
            session,
            isNewUser: false,
          },
        });
      }
    }

    // Generate new session ID
    const sessionId = generateSessionId(userAgent, ipAddress);

    // Check if user exists for this browser/IP combination
    let user = storage.getUserBySessionId(sessionId);

    // Create new user if doesn't exist
    if (!user) {
      user = storage.createUser(sessionId);
    }

    // Create new session
    const session = {
      id: sessionId,
      userId: user.id,
      browserFingerprint: fingerprint,
      ipAddress,
      userAgent,
      createdAt: new Date(),
      expiresAt: getSessionExpiration(30), // 30 days
    };

    storage.createSession(session);

    // Set cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    };

    cookieStore.set(USER_COOKIE_NAME, user.id, cookieOptions);
    cookieStore.set(SESSION_COOKIE_NAME, sessionId, cookieOptions);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        user,
        session,
        isNewUser: !existingUserId,
      },
    });
  } catch (error) {
    console.error('Error initializing user:', error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: 'Failed to initialize user',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    const userId = cookieStore.get(USER_COOKIE_NAME)?.value;
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!userId || !sessionId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'No active session',
        },
        { status: 401 }
      );
    }

    const user = storage.getUserById(userId);
    const session = storage.getSessionById(sessionId);

    if (!user || !session) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Invalid session',
        },
        { status: 401 }
      );
    }

    // Check if session expired
    if (new Date() > session.expiresAt) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Session expired',
        },
        { status: 401 }
      );
    }

    // Update activity
    storage.updateUserActivity(userId);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        user,
        session,
      },
    });
  } catch (error) {
    console.error('Error getting session:', error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: 'Failed to get session',
      },
      { status: 500 }
    );
  }
}
