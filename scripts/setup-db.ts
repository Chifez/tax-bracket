#!/usr/bin/env node
/**
 * Database setup script
 * 
 * This script:
 * 1. Enables the pgvector extension if it doesn't exist
 * 2. Runs drizzle-kit push to sync schema
 */

import { Pool } from 'pg'
import { execSync } from 'child_process'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set')
    console.error('Please set DATABASE_URL in your .env file')
    process.exit(1)
}

async function enablePgVectorExtension() {
    console.log('🔌 Connecting to database...')
    const pool = new Pool({
        connectionString: DATABASE_URL,
    })

    try {
        console.log('📦 Checking for pgvector extension...')
        
        // Check if extension exists
        const checkResult = await pool.query(`
            SELECT EXISTS(
                SELECT 1 FROM pg_extension WHERE extname = 'vector'
            ) as exists;
        `)

        if (checkResult.rows[0].exists) {
            console.log('✅ pgvector extension is already enabled')
        } else {
            console.log('📥 Enabling pgvector extension...')
            await pool.query('CREATE EXTENSION IF NOT EXISTS vector;')
            console.log('✅ pgvector extension enabled successfully')
        }

        // Verify the extension is working
        const verifyResult = await pool.query(`
            SELECT extversion FROM pg_extension WHERE extname = 'vector';
        `)
        
        if (verifyResult.rows.length > 0) {
            console.log(`✅ pgvector version: ${verifyResult.rows[0].extversion}`)
        }
    } catch (error: any) {
        console.error('❌ Error enabling pgvector extension:', error.message)
        
        if (error.code === '42704') {
            console.error('\n💡 Tip: The pgvector extension may not be installed on your PostgreSQL server.')
            console.error('   For local PostgreSQL, install it with:')
            console.error('   - macOS: brew install pgvector')
            console.error('   - Ubuntu/Debian: apt-get install postgresql-XX-pgvector')
            console.error('   - Or compile from source: https://github.com/pgvector/pgvector')
        }
        
        throw error
    } finally {
        await pool.end()
    }
}

async function runDrizzlePush() {
    console.log('\n🔄 Running drizzle-kit push...')
    try {
        execSync('npx drizzle-kit push', {
            stdio: 'inherit',
            env: process.env,
        })
        console.log('✅ Database schema synced successfully')
    } catch (error: any) {
        console.error('❌ Error running drizzle-kit push:', error.message)
        throw error
    }
}

async function main() {
    try {
        await enablePgVectorExtension()
        await runDrizzlePush()
        console.log('\n🎉 Database setup completed successfully!')
    } catch (error) {
        console.error('\n❌ Database setup failed')
        process.exit(1)
    }
}

main()
