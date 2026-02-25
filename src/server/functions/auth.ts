
import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { users, passwordResetTokens } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword, verifyPassword, validatePassword } from '@/server/lib/password'
import { createSession, revokeSession, useAppSession } from '@/server/lib/session'
import { getAuthenticatedUser } from '@/server/middleware/auth'
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '@/server/validators/auth'
import { badRequest, unauthorized } from '@/server/lib/error'
import { queueAuthEmail } from '@/server/functions/email-queue'

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
export const register = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => registerSchema.parse(data))
    .handler(async ({ data }) => {
        // Validate password strength
        const strength = validatePassword(data.password)
        if (!strength.valid) {
            throw badRequest(strength.error || 'weak password')
        }

        // Check if email already exists
        const existingUser = await db.query.users.findFirst({
            where: eq(users.email, data.email)
        })

        if (existingUser) {
            throw badRequest('Email already registered')
        }

        // Create user
        const passwordHash = await hashPassword(data.password)
        const [newUser] = await db.insert(users).values({
            email: data.email,
            passwordHash,
            name: data.name,
        }).returning()

        // Create session
        const session = await createSession(newUser.id)

        // Set session cookie
        const appSession = await useAppSession()
        await appSession.update({ token: session.token })

        // Queue welcome email (fire and forget)
        queueAuthEmail({ to: newUser.email, name: newUser.name, type: 'welcome' }).catch(() => { })

        return { user: newUser }
    })

/**
 * Login
 */
export const login = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => loginSchema.parse(data))
    .handler(async ({ data }) => {
        const user = await db.query.users.findFirst({
            where: eq(users.email, data.email)
        })

        if (!user || !user.passwordHash) {
            throw unauthorized('Invalid email or password')
        }

        const isValid = await verifyPassword(data.password, user.passwordHash)
        if (!isValid) {
            throw unauthorized('Invalid email or password')
        }

        // Create session
        const session = await createSession(user.id)

        // Set session cookie
        const appSession = await useAppSession()
        await appSession.update({ token: session.token })

        return { user }
    })

/**
 * Logout
 */
export const logout = createServerFn()
    .handler(async () => {
        const appSession = await useAppSession()
        const token = appSession.data.token

        if (token) {
            await revokeSession(token)
        }

        await appSession.clear()
        return { success: true }
    })

/**
 * Forgot Password
 */
export const forgotPassword = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => forgotPasswordSchema.parse(data))
    .handler(async ({ data }) => {
        const user = await db.query.users.findFirst({
            where: eq(users.email, data.email)
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

        const appUrl = process.env.APP_URL || 'http://localhost:3000'
        const resetLink = `${appUrl}/auth/reset-password?token=${token}`

        // Queue password reset email
        queueAuthEmail({
            to: user.email,
            name: user.name,
            type: 'password-reset',
            resetLink,
        }).catch(() => { })

        return { success: true }
    })

/**
 * Reset Password
 */
export const resetPassword = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => resetPasswordSchema.parse(data))
    .handler(async ({ data }) => {
        const resetToken = await db.query.passwordResetTokens.findFirst({
            where: eq(passwordResetTokens.token, data.token)
        })

        if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
            throw badRequest('Invalid or expired reset token')
        }

        // Update password
        const passwordHash = await hashPassword(data.password)
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

        // Queue password changed confirmation email
        const changedUser = await db.query.users.findFirst({ where: eq(users.id, resetToken.userId) })
        if (changedUser) {
            queueAuthEmail({ to: changedUser.email, name: changedUser.name, type: 'password-changed' }).catch(() => { })
        }

        return { success: true }
    })