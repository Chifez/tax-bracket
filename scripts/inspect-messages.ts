import { db } from './src/db'
import { messages } from './src/db/schema'
import { desc } from 'drizzle-orm'

async function checkOrder() {
    const msgs = await db.query.messages.findMany({
        orderBy: [desc(messages.createdAt)],
        limit: 10
    })

    console.log("LAST 10 MESSAGES:");
    for (const msg of msgs.reverse()) { // oldest first among the last 10
        console.log(`[${msg.createdAt.toISOString()}] Role: ${msg.role.padEnd(10)} | ID: ${msg.id} | Content: ${msg.content.substring(0, 30).replace(/\n/g, ' ')}...`)
    }
    process.exit(0)
}

checkOrder().catch(console.error)
