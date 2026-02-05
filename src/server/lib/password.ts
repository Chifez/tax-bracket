import bcrypt from 'bcrypt'

const SALT_ROUNDS = 12

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
}

/**
 * Validate password strength
 * - At least 8 characters
 * - Contains at least one number
 * - Contains at least one letter
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
    if (password.length < 8) {
        return { valid: false, error: 'Password must be at least 8 characters' }
    }
    if (!/\d/.test(password)) {
        return { valid: false, error: 'Password must contain at least one number' }
    }
    if (!/[a-zA-Z]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one letter' }
    }
    return { valid: true }
}
