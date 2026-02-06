import { randomBytes } from 'crypto'
import { db } from '@/db'
import { sessions, users } from '@/db/schema'
import { eq, and, isNull, gt } from 'drizzle-orm'
import type { User } from '@/db/schema'
import { useSession } from '@tanstack/react-start/server'

const SESSION_DURATION_DAYS = 30

/**
 * Generate a secure random session token
 */
function generateToken(): string {
    return randomBytes(32).toString('hex')
}

/**
 * Create a new session for a user
 */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = generateToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS)

    await db.insert(sessions).values({
        userId,
        token,
        expiresAt,
    })

    return { token, expiresAt }
}

/**
 * Validate a session token and return the user if valid
 * Checks that token exists, is not expired, and is not revoked
 */
export async function validateSession(token: string): Promise<User | null> {
    const result = await db.query.sessions.findFirst({
        where: and(
            eq(sessions.token, token),
            isNull(sessions.revokedAt),
            gt(sessions.expiresAt, new Date())
        ),
        with: {
            // We need to define relations in schema for this to work
            // For now, we'll do a manual join
        }
    })

    if (!result) {
        return null
    }

    // Get the user
    const user = await db.query.users.findFirst({
        where: eq(users.id, result.userId)
    })

    return user ?? null
}

/**
 * Revoke a session (for logout)
 * Sets revokedAt timestamp to prevent further use
 */
export async function revokeSession(token: string): Promise<void> {
    await db.update(sessions)
        .set({ revokedAt: new Date() })
        .where(eq(sessions.token, token))
}

/**
 * Revoke all sessions for a user (for password change, security events)
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
    await db.update(sessions)
        .set({ revokedAt: new Date() })
        .where(and(
            eq(sessions.userId, userId),
            isNull(sessions.revokedAt)
        ))
}

/**
 * Get session by token (for cookie operations)
 */
export async function getSessionByToken(token: string) {
    return db.query.sessions.findFirst({
        where: and(
            eq(sessions.token, token),
            isNull(sessions.revokedAt),
            gt(sessions.expiresAt, new Date())
        )
    })
}

/**
 * App Session Hook
 * Manages the HTTP-only cookie for the session token
 */
export function useAppSession() {
    return useSession<{ token: string }>({
        name: 'session_token',
        password: process.env.SESSION_SECRET!,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            httpOnly: true,
        },
    })
}
