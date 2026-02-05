import { getCookie } from 'vinxi/http'
import { getSessionByToken } from '@/server/lib/session'
import type { User } from '@/db/schema'

/**
 * Get the current authenticated user from the request session
 */
export async function getAuthenticatedUser(): Promise<User | null> {
    const token = getCookie('session_token')
    if (!token) return null

    const session = await getSessionByToken(token)
    if (!session) return null

    // If we have a valid session, let's get the user
    // Since we're using Drizzle queries, we could have fetched user with the session
    // using 'with' relation, but getSessionByToken is optimized for validation.
    // Let's rely on getSessionByToken return type if we update it, or re-fetch/use relations.

    // Actually, getSessionByToken in lib/session.ts currently returns just the session.
    // Let's update `validateSession` in lib/session to be the main entry point which returns the user.
    // But since this is a middleware-like helper, we might want to just get the user.

    // Let's import the validateSession from lib/session which already does the user lookup
    // implementation details are in src/server/lib/session.ts
    const { validateSession } = await import('@/server/lib/session')
    return validateSession(token)
}

/**
 * Require authentication - throws error if not authenticated
 * Use this in server functions that require a user
 */
export async function requireAuth(): Promise<User> {
    const user = await getAuthenticatedUser()
    if (!user) {
        throw new Error('Unauthorized')
    }
    return user
}
