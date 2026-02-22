

export const RESPONSE_TEMPLATES = {
    GREETING: {
        role: 'assistant',
        content: '',
        sections: [
            {
                id: 'welcome-section',
                title: 'Welcome to TaxBracket AI 🇳🇬',
                icon: 'Zap',
                contents: [
                    {
                        type: 'text',
                        content: 'I am your advanced financial analyst specializing in Nigerian tax laws (Finance Act 2025). I can help you:'
                    },
                    {
                        type: 'list',
                        content: [
                            'Analyze bank statements for hidden fees',
                            'Calculate Personal Income Tax (PIT)',
                            'Identify tax-deductible expenses',
                            'Provide financial health insights'
                        ]
                    },
                    {
                        type: 'text',
                        content: 'Please upload a bank statement (PDF, CSV) to get started, or ask me a general finance question.'
                    }
                ]
            }
        ],
        stats: {
            sources: 0,
            words: 45,
            timeSaved: '0.5s'
        }
    },
    NO_DATA_UPLOAD_REQUEST: {
        role: 'assistant',
        content: '',
        sections: [
            {
                id: 'upload-request',
                title: 'Data Required',
                icon: 'FileUp',
                contents: [
                    {
                        type: 'text',
                        content: 'To perform this calculation, I need access to your financial data. Please upload your bank statement.'
                    },
                    {
                        type: 'list',
                        content: [
                            'Supported formats: PDF, SCV, Excel',
                            'Secure processing',
                            'No data stored permanently'
                        ]
                    }
                ]
            }
        ]
    }
} as const

export function getTemplate(key: keyof typeof RESPONSE_TEMPLATES) {
    return {
        ...RESPONSE_TEMPLATES[key],
        createdAt: new Date(),
        id: crypto.randomUUID()
    }
}
