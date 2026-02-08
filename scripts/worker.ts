import { startFileProcessor } from '@/workers/file-processor'
import { getQueue } from '@/server/lib/queue'
import dotenv from 'dotenv'

dotenv.config()

async function main() {
    console.log('Starting worker process...')

    // Initialize DB/Queue
    await getQueue()

    // Start processors
    await startFileProcessor()

    console.log('Worker process running.')
}

main().catch(console.error)
