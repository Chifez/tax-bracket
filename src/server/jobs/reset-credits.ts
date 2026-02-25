import { getQueue, QUEUE_NAMES } from '@/server/lib/queue'
import { resetAllUsersCredits } from '@/server/lib/credits'

/**
 * Register the weekly credit reset job with pg-boss.
 * Runs every Monday at 00:00 UTC.
 */
export async function registerCreditResetJob() {
    const boss = await getQueue()

    await boss.createQueue(QUEUE_NAMES.RESET_CREDITS)

    // Schedule job to run every Monday at 00:00 UTC
    // Cron format: minute hour day-of-month month day-of-week
    // 0 0 * * 1 = 00:00 every Monday
    await boss.schedule(QUEUE_NAMES.RESET_CREDITS, '0 0 * * 1', {}, {
        tz: 'UTC',
    })

    // Register the handler
    await boss.work(QUEUE_NAMES.RESET_CREDITS, async () => {
        console.log('[CreditResetJob] Starting weekly credit reset...')

        try {
            const result = await resetAllUsersCredits()

            if (result.skipped) {
                console.log('[CreditResetJob] Credit reset skipped (not in beta mode or purchases enabled)')
                return { success: true, skipped: true, usersReset: 0 }
            }

            console.log(`[CreditResetJob] Successfully reset credits for ${result.count} users`)
            return { success: true, skipped: false, usersReset: result.count }
        } catch (error) {
            console.error('[CreditResetJob] Failed to reset credits:', error)
            throw error
        }
    })

    console.log('[CreditResetJob] Registered credit reset job (runs every Monday at 00:00 UTC)')
}

/**
 * Manually trigger a credit reset (for testing or admin use)
 */
export async function triggerCreditReset() {
    const boss = await getQueue()
    await boss.send(QUEUE_NAMES.RESET_CREDITS, {})
    console.log('[CreditResetJob] Manually triggered credit reset')
}
