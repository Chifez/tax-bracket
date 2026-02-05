import { createServerFn } from '@tanstack/react-start'
import { setCookie, deleteCookie, getCookie } from 'vinxi/http'
import { db } from '@/db'
import { users, passwordResetTokens } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword, verifyPassword, validatePassword } from '@/server/lib/password'
import { createSession, revokeSession } from '@/server/lib/session'
import { getAuthenticatedUser } from '@/server/middleware/auth'
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '@/server/validators/auth'

/**
 * Get current user
 */
export const getMe = createServerFn()
    .handler(async () => {
        const user = await getAuthenticatedUser()
        return { user }
    })

/**
 * Register a new user
 */
export const register = createServerFn()
    .handler(async (data: unknown) => {
        // Validate with zod
        const validatedData = registerSchema.parse(data)

        // Validate password strength
        const strength = validatePassword(validatedData.password)
        if (!strength.valid) {
            throw new Error(strength.error)
        }

        // Check if email already exists
        const existingUser = await db.query.users.findFirst({
            where: eq(users.email, validatedData.email)
        })

        if (existingUser) {
            throw new Error('Email already registered')
        }

        // Create user
        const passwordHash = await hashPassword(validatedData.password)
        const [newUser] = await db.insert(users).values({
            email: validatedData.email,
            passwordHash,
            name: validatedData.name,
        }).returning()

        // Create session
        const session = await createSession(newUser.id)

        // Set cookie
        setCookie('session_token', session.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            expires: session.expiresAt
        })

        return { user: newUser }
    })

/**
 * Login
 */
export const login = createServerFn()
    .handler(async (data: unknown) => {
        const validatedData = loginSchema.parse(data)

        const user = await db.query.users.findFirst({
            where: eq(users.email, validatedData.email)
        })

        if (!user || !user.passwordHash) {
            throw new Error('Invalid email or password')
        }

        const isValid = await verifyPassword(validatedData.password, user.passwordHash)
        if (!isValid) {
            throw new Error('Invalid email or password')
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

/**
 * Logout
 */
export const logout = createServerFn()
    .handler(async () => {
        const token = getCookie('session_token')
        if (token) {
            await revokeSession(token)
            deleteCookie('session_token', { path: '/' })
        }
        return { success: true }
    })

/**
 * Forgot Password
 */
export const forgotPassword = createServerFn()
    .handler(async (data: unknown) => {
        const validatedData = forgotPasswordSchema.parse(data)

        const user = await db.query.users.findFirst({
            where: eq(users.email, validatedData.email)
        })

        if (!user) {
            // Don't reveal user existence
            return { success: true }
        }

        // Create reset token
        const token = crypto.randomUUID()
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 1) // 1 hour expiry

        await db.insert(passwordResetTokens).values({
            userId: user.id,
            token,
            expiresAt,
        })

        // TODO: Send email
        if (process.env.NODE_ENV === 'development') {
            console.log(`[DEV] Password reset link: http://localhost:3000/auth/reset-password?token=${token}`)
        }

        return { success: true }
    })

/**
 * Reset Password
 */
export const resetPassword = createServerFn()
    .handler(async (data: unknown) => {
        const validatedData = resetPasswordSchema.parse(data)

        const resetToken = await db.query.passwordResetTokens.findFirst({
            where: eq(passwordResetTokens.token, validatedData.token)
        })

        if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
            throw new Error('Invalid or expired reset token')
        }

        // Update password
        const passwordHash = await hashPassword(validatedData.password)
        await db.update(users)
            .set({ passwordHash })
            .where(eq(users.id, resetToken.userId))

        // Mark token as used
        await db.update(passwordResetTokens)
            .set({ usedAt: new Date() })
            .where(eq(passwordResetTokens.id, resetToken.id))

        // Revoke all existing sessions for security
        const { revokeAllUserSessions } = await import('@/server/lib/session')
        await revokeAllUserSessions(resetToken.userId)

        return { success: true }
    })