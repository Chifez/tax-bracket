import { getQueue, QUEUE_NAMES } from '@/server/lib/queue'
import dotenv from 'dotenv'

dotenv.config()

async function testEmail() {
    console.log('--- Comprehensive Email Setup Test ---')

    const testRecipient = process.env.TEST_EMAIL || 'chifez1@gmail.com'
    console.log(`1. Using test recipient: ${testRecipient}`)
    console.log('   (Set TEST_EMAIL env var to change this)\n')

    console.log('2. Checking environment variables...')
    const requiredVars = ['DATABASE_URL', 'ZEPTO_SMTP_USER', 'ZEPTO_SMTP_TOKEN']
    const missing = requiredVars.filter(v => !process.env[v])

    if (missing.length > 0) {
        console.error(`❌ Missing environment variables: ${missing.join(', ')}`)
        process.exit(1)
    }
    console.log('✅ Environment variables present.')

    console.log('\n3. Connecting to queue...')
    const boss = await getQueue()
    console.log('✅ Queue connected.')

    console.log('\n4. Enqueuing all email types...')

    try {
        // 4.1 Auth - Welcome
        await boss.send(QUEUE_NAMES.SEND_AUTH_EMAIL, {
            to: testRecipient,
            name: 'Test User',
            type: 'welcome',
        })
        console.log('✅ Welcome email enqueued.')

        // 4.2 Auth - Password Reset
        await boss.send(QUEUE_NAMES.SEND_AUTH_EMAIL, {
            to: testRecipient,
            name: 'Test User',
            type: 'password-reset',
            resetLink: `${process.env.APP_URL || 'http://localhost:3000'}/auth/reset-password?token=test-token-123`,
        })
        console.log('✅ Password Reset email enqueued.')

        // 4.3 Auth - Password Changed
        await boss.send(QUEUE_NAMES.SEND_AUTH_EMAIL, {
            to: testRecipient,
            name: 'Test User',
            type: 'password-changed',
        })
        console.log('✅ Password Changed confirmation enqueued.')

        // 4.4 Support Request
        await boss.send(QUEUE_NAMES.SEND_SUPPORT_EMAIL, {
            fromName: 'Test Reporter',
            fromEmail: testRecipient,
            type: 'support',
            subject: 'Test: Help & Support Flow',
            message: 'This is a test of the Help & Support email flow. Everything looks good so far.',
        })
        console.log('✅ Support request enqueued.')

        // 4.5 Feedback
        await boss.send(QUEUE_NAMES.SEND_SUPPORT_EMAIL, {
            fromName: 'Test Giver',
            fromEmail: testRecipient,
            type: 'feedback',
            subject: 'Test: Feedback Flow',
            message: 'This is a test of the Feedback email flow. Everything looks good so far.',
        })
        console.log('✅ Feedback email enqueued.')

        console.log('\n--- Test Enqueue Complete ---')
        console.log('NEXT STEPS:')
        console.log('1. Make sure the worker is running:  npm run worker')
        console.log('2. The worker will pick up the jobs and log SMTP activity.')
        console.log(`3. Check ${testRecipient} for 5 new emails.`)

    } catch (error) {
        console.error('❌ Failed:', error)
    } finally {
        await boss.stop()
        process.exit(0)
    }
}

testEmail()
