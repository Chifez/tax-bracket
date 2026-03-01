let boss: any | null = null

export const getQueue = async () => {
    if (boss) return boss

    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) throw new Error('DATABASE_URL is not set')

    const PgBoss = (await import('pg-boss')).default

    boss = new PgBoss(databaseUrl)
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