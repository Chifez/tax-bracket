import nodemailer from 'nodemailer'
import { getQueue, QUEUE_NAMES } from '@/server/lib/queue'

const transporter = nodemailer.createTransport({
    host: process.env.ZEPTO_SMTP_HOST || 'smtp.zeptomail.com',
    port: Number(process.env.ZEPTO_SMTP_PORT || 587),
    secure: false,
    auth: {
        user: process.env.ZEPTO_SMTP_USER!,
        pass: process.env.ZEPTO_SMTP_TOKEN!,
    },
})

type AuthEmailType = 'welcome' | 'password-reset' | 'password-changed'

interface AuthEmailPayload {
    to: string
    name: string
    type: AuthEmailType
    resetLink?: string
}

interface SupportEmailPayload {
    fromName: string
    fromEmail: string
    type: 'support' | 'feedback'
    subject: string
    message: string
}

interface ProductUpdateEmailPayload {
    to: string
    name: string
    subject: string
    content: string
}

function getAuthEmailContent(payload: AuthEmailPayload) {
    const appUrl = process.env.APP_URL || 'https://taxbracketai.com'

    switch (payload.type) {
        case 'welcome':
            return {
                subject: 'Welcome to TaxBracket!',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
                        <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">Welcome to TaxBracket, ${payload.name}! 🎉</h1>
                        <p style="color: #6b7280; line-height: 1.6;">You're all set. Your account has been created and you can start using TaxBracket right away.</p>
                        <a href="${appUrl}" style="display: inline-block; margin-top: 24px; padding: 12px 24px; background-color: #111827; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 500;">
                            Get Started
                        </a>
                        <p style="margin-top: 32px; font-size: 12px; color: #9ca3af;">If you didn't create this account, you can safely ignore this email.</p>
                    </div>
                `,
            }
        case 'password-reset':
            return {
                subject: 'Reset your TaxBracket password',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
                        <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">Reset your password</h1>
                        <p style="color: #6b7280; line-height: 1.6;">Hi ${payload.name}, we received a request to reset your TaxBracket password. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
                        <a href="${payload.resetLink}" style="display: inline-block; margin-top: 24px; padding: 12px 24px; background-color: #111827; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 500;">
                            Reset Password
                        </a>
                        <p style="margin-top: 16px; font-size: 12px; color: #9ca3af;">Or copy and paste this link: ${payload.resetLink}</p>
                        <p style="margin-top: 32px; font-size: 12px; color: #9ca3af;">If you didn't request a password reset, you can safely ignore this email.</p>
                    </div>
                `,
            }
        case 'password-changed':
            return {
                subject: 'Your TaxBracket password was changed',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
                        <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">Password changed</h1>
                        <p style="color: #6b7280; line-height: 1.6;">Hi ${payload.name}, your TaxBracket password was successfully changed.</p>
                        <p style="color: #6b7280; line-height: 1.6;">If you didn't make this change, please <a href="${appUrl}/auth/forgot-password" style="color: #111827;">reset your password immediately</a> or contact our support team.</p>
                        <p style="margin-top: 32px; font-size: 12px; color: #9ca3af;">This is an automated security notification.</p>
                    </div>
                `,
            }
    }
}

export async function registerEmailJobs() {
    const boss = await getQueue()

    await boss.createQueue(QUEUE_NAMES.SEND_AUTH_EMAIL)
    await boss.createQueue(QUEUE_NAMES.SEND_SUPPORT_EMAIL)
    await boss.createQueue(QUEUE_NAMES.SEND_PRODUCT_UPDATE_EMAIL)

    await boss.work(QUEUE_NAMES.SEND_AUTH_EMAIL, { retryLimit: 3 } as any, async (jobs: any[]) => {
        for (const job of jobs) {
            const payload = job.data as AuthEmailPayload
            const { subject, html } = getAuthEmailContent(payload)
            await transporter.sendMail({
                from: '"TaxBracket" <noreply@taxbracketai.com>',
                to: payload.to,
                subject,
                html,
            })
        }
    })

    await boss.work(QUEUE_NAMES.SEND_SUPPORT_EMAIL, { retryLimit: 3 } as any, async (jobs: any[]) => {
        for (const job of jobs) {
            const { fromName, fromEmail, type, subject, message } = job.data as SupportEmailPayload
            const label = type === 'feedback' ? 'Feedback' : 'Help & Support'
            await transporter.sendMail({
                from: '"TaxBracket" <support@taxbracketai.com>',
                to: 'support@taxbracketai.com',
                replyTo: fromEmail,
                subject: `[${label}] ${subject}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
                        <h1 style="font-size: 20px; font-weight: 700; margin-bottom: 4px;">${label} from ${fromName}</h1>
                        <p style="font-size: 13px; color: #6b7280; margin-bottom: 24px;">${fromEmail}</p>
                        <p style="white-space: pre-wrap; line-height: 1.6; color: #111827;">${message}</p>
                    </div>
                `,
            })
        }
    })

    await boss.work(QUEUE_NAMES.SEND_PRODUCT_UPDATE_EMAIL, { retryLimit: 3 } as any, async (jobs: any[]) => {
        for (const job of jobs) {
            const payload = job.data as ProductUpdateEmailPayload
            await transporter.sendMail({
                from: '"TaxBracket" <hello@taxbracketai.com>',
                to: payload.to,
                subject: payload.subject,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
                        <h1 style="font-size: 22px; font-weight: 700; margin-bottom: 16px;">${payload.subject}</h1>
                        <div style="line-height: 1.6; color: #374151;">${payload.content}</div>
                        <p style="margin-top: 40px; font-size: 11px; color: #9ca3af;">
                            You're receiving this because you opted in to product updates from TaxBracket.<br/>
                            To unsubscribe, update your <a href="${process.env.APP_URL || 'https://taxbracketai.com'}/settings" style="color: #6b7280;">notification preferences</a>.
                        </p>
                    </div>
                `,
            })
        }
    })
}
