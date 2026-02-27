import 'dotenv/config'

import { startFileProcessor } from '@/workers/file-processor'
import { startAggregationWorker } from '@/workers/aggregation-worker'
import { registerCreditResetJob } from '@/server/jobs/reset-credits'
import { registerEmailJobs } from '@/server/jobs/email'
import { getQueue } from '@/server/lib/queue'

async function main() {
    console.log('Starting worker process...')
    console.log('Environment:', {
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL: process.env.DATABASE_URL ? '[set]' : '[not set]',
    })

    // Initialize DB/Queue
    const queue = await getQueue()

    // Start processors
    await startFileProcessor()
    await startAggregationWorker()

    // Register scheduled jobs
    await registerCreditResetJob()
    await registerEmailJobs()

    console.log('Worker process running. Press Ctrl+C to stop.')

    // Graceful shutdown handler
    const shutdown = async () => {
        console.log('\nShutting down worker...')
        try {
            await queue.stop()
            console.log('Worker stopped gracefully.')
            process.exit(0)
        } catch (error) {
            console.error('Error during shutdown:', error)
            process.exit(1)
        }
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
}

main().catch((error) => {
    console.error('Worker failed to start:', error)
    process.exit(1)
})
