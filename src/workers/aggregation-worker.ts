import { getQueue, QUEUE_NAMES } from '@/server/lib/queue'
import { computeAggregates } from '@/server/lib/aggregator'
import { buildContext } from '@/server/lib/context-builder'

/**
 * Worker for the COMPUTE_AGGREGATES and BUILD_CONTEXT queue jobs.
 * These run after file processing completes.
 */
export async function startAggregationWorker() {
    const queue = await getQueue()

    console.log(`Starting worker for ${QUEUE_NAMES.COMPUTE_AGGREGATES}...`)

    await queue.createQueue(QUEUE_NAMES.COMPUTE_AGGREGATES)
    // Aggregation worker
    await queue.work(QUEUE_NAMES.COMPUTE_AGGREGATES, async (jobs: any[]) => {
        for (const job of jobs) {
            const { userId, taxYear } = job.data
            console.log(`Computing aggregates for user ${userId}, year ${taxYear}...`)

            try {
                await computeAggregates(userId, taxYear)

                // Chain: after aggregation, build AI context
                await queue.send(QUEUE_NAMES.BUILD_CONTEXT, {
                    userId,
                    taxYear,
                })
            } catch (error: any) {
                console.error(`Failed to compute aggregates:`, error)
                throw error
            }
        }
    })

    console.log(`Starting worker for ${QUEUE_NAMES.BUILD_CONTEXT}...`)

    await queue.createQueue(QUEUE_NAMES.BUILD_CONTEXT)
    // Context builder worker
    await queue.work(QUEUE_NAMES.BUILD_CONTEXT, async (jobs: any[]) => {
        for (const job of jobs) {
            const { userId, taxYear } = job.data
            console.log(`Building AI context for user ${userId}, year ${taxYear}...`)

            try {
                await buildContext(userId, taxYear)
            } catch (error: any) {
                console.error(`Failed to build context:`, error)
                throw error
            }
        }
    })
}
