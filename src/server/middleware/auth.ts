
import { useAppSession, validateSession } from '@/server/lib/session'
import type { User } from '@/db/schema'

/**
 * Get the current authenticated user from the request session
 */
export async function getAuthenticatedUser(): Promise<User | null> {
    const session = await useAppSession()
    const token = session.data.token

    if (!token) return null

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
