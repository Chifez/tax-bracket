import PgBoss from 'pg-boss'

const databaseUrl = process.env.DATABASE_URL!

// Singleton instance
let boss: PgBoss | null = null

export const getQueue = async () => {
    if (boss) return boss

    boss = new PgBoss(databaseUrl)

    // Start boss (it handles schema creation)
    await boss.start()

    console.log('Queue system started')
    return boss
}

export const QUEUE_NAMES = {
    PARSE_FILE: 'parse-file',
    COMPUTE_AGGREGATES: 'compute-aggregates',
    BUILD_CONTEXT: 'build-context',
}
