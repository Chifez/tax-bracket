import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/llms.txt')({
    server: {
        handlers: {
            GET: async () => {
                const content = `# TaxBracket

> TaxBracket is an AI-powered financial assistant for Nigerian tax calculations and bank statement analysis.

## Core Features
- **Bank Statement Upload**: Upload PDF, CSV, or Excel statements for instant processing.
- **Automated Tax Calculation**: Get accurate Nigerian Personal Income Tax (PIT) breakdowns based on current tax laws (Finance Act 2023/2024).
- **Transaction Analysis**: Automatically categorizes income, expenses, and transfers.
- **AI Chat Assistant**: Ask questions about your finances, tax liabilities, and deductions in natural language.

## Documentation
- **Getting Started**: https://taxbracketai.com/docs
- **Privacy Policy**: https://taxbracketai.com/privacy
- **Terms of Service**: https://taxbracketai.com/terms

## Technology Stack
- **Frontend**: React, TanStack Start, Tailwind CSS
- **Backend**: TanStack Start Server Functions, Drizzle ORM, PostgreSQL
- **AI**: Vercel AI SDK, OpenAI

## Contact
- **Website**: https://taxbracketai.com
- **Support**: support@taxbracket.ng
`

                return new Response(content, {
                    headers: {
                        'Content-Type': 'text/plain',
                    },
                })
            },
        },
    }
})
