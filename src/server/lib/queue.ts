import PgBoss from 'pg-boss'

// Singleton instance
let boss: PgBoss | null = null

export const getQueue = async () => {
    if (boss) return boss

    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) throw new Error('DATABASE_URL is not set')

    boss = new PgBoss(databaseUrl)

    // Start boss (it handles schema creation)
    await boss.start()

    console.log('[Queue] PgBoss client connected')
    return boss
}

export const QUEUE_NAMES = {
    PARSE_FILE: 'parse-file',
    COMPUTE_AGGREGATES: 'compute-aggregates',
    BUILD_CONTEXT: 'build-context',
    RESET_CREDITS: 'reset-credits',
    SEND_AUTH_EMAIL: 'send-auth-email',
    SEND_SUPPORT_EMAIL: 'send-support-email',
    SEND_PRODUCT_UPDATE_EMAIL: 'send-product-update-email',
}
