import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a unique session ID based on browser fingerprint and IP address
 * @param userAgent - Browser user agent string
 * @param ipAddress - User's IP address
 * @returns A unique session identifier
 */
export function generateSessionId(userAgent: string, ipAddress: string): string {
  const fingerprint = createBrowserFingerprint(userAgent, ipAddress);
  const timestamp = Date.now();
  const random = uuidv4();

  // Combine fingerprint with timestamp and random UUID for uniqueness
  const sessionData = `${fingerprint}-${timestamp}-${random}`;

  return crypto
    .createHash('sha256')
    .update(sessionData)
    .digest('hex');
}

/**
 * Creates a browser fingerprint from user agent and IP
 * @param userAgent - Browser user agent string
 * @param ipAddress - User's IP address
 * @returns A fingerprint hash
 */
export function createBrowserFingerprint(userAgent: string, ipAddress: string): string {
  const data = `${userAgent}:${ipAddress}`;

  return crypto
    .createHash('md5')
    .update(data)
    .digest('hex');
}

/**
 * Extracts IP address from request headers
 * Checks common headers used by proxies and load balancers
 */
export function getClientIp(headers: Headers): string {
  // Check common headers in order of preference
  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return xForwardedFor.split(',')[0].trim();
  }

  const xRealIp = headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp;
  }

  const cfConnectingIp = headers.get('cf-connecting-ip'); // Cloudflare
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to a default if no IP found
  return '0.0.0.0';
}

/**
 * Gets user agent from request headers
 */
export function getUserAgent(headers: Headers): string {
  return headers.get('user-agent') || 'unknown';
}

/**
 * Validates if a session has expired
 */
export function isSessionExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Creates session expiration date (default: 30 days from now)
 */
export function getSessionExpiration(days: number = 30): Date {
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + days);
  return expiration;
}
