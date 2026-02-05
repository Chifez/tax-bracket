import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie } from 'vinxi/http'
import { z } from 'zod'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { createSession } from '@/server/lib/session'

const googleAuthSchema = z.object({
    code: z.string(),
})

/**
 * Generate Google OAuth URL
 */
export const getGoogleAuthUrl = createServerFn()
    .handler(async () => {
        const clientId = process.env.GOOGLE_CLIENT_ID
        const redirectUri = process.env.GOOGLE_CALLBACK_URL

        if (!clientId || !redirectUri) {
            throw new Error('Google OAuth not configured')
        }

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'email profile',
            access_type: 'offline',
            prompt: 'consent',
        })

        return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` }
    })

/**
 * Handle Google Callback
 */
export const handleGoogleCallback = createServerFn()
    .handler(async (data: unknown) => {
        // Validate the incoming data
        const validatedData = googleAuthSchema.parse(data)

        // Exchange code for token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code: validatedData.code,
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                redirect_uri: process.env.GOOGLE_CALLBACK_URL!,
                grant_type: 'authorization_code',
            })
        })

        if (!tokenResponse.ok) {
            throw new Error('Failed to exchange token')
        }

        const tokens = await tokenResponse.json()

        // Get user profile
        const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        })

        if (!profileResponse.ok) {
            throw new Error('Failed to get user profile')
        }

        const profile = await profileResponse.json()

        // Find or create user
        let user = await db.query.users.findFirst({
            where: eq(users.email, profile.email)
        })

        if (!user) {
            // Create new user
            const [newUser] = await db.insert(users).values({
                email: profile.email,
                name: profile.name,
                googleId: profile.id,
                emailVerified: true,
            }).returning()
            user = newUser
        } else if (!user.googleId) {
            // Link existing user
            await db.update(users)
                .set({ googleId: profile.id, emailVerified: true })
                .where(eq(users.id, user.id))
        }

        // Create session
        const session = await createSession(user.id)

        // Set cookie
        setCookie('session_token', session.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            expires: session.expiresAt
        })

        return { user }
    })