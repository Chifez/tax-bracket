import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function main() {
    const res = await db.execute(sql`SELECT id, name, data, state, started_on, completed_on, retry_count, output FROM pgboss.job ORDER BY created_on DESC LIMIT 10`);
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
}
main().catch(console.error);
