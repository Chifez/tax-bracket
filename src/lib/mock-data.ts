import type { Message } from '@/types'

/**
 * Generate mock AI responses based on user message content
 * Used for demo/development purposes
 */
export function generateMockResponse(userMessage: string, _hasFiles: boolean): Omit<Message, 'id' | 'timestamp'> {
    const lowerMsg = userMessage.toLowerCase()

    // Tax-related questions - includes multi-line chart (income + tax)
    if (lowerMsg.includes('tax') || lowerMsg.includes('income')) {
        return {
            role: 'assistant',
            content: '',
            responseMode: 'explained',
            sections: [
                {
                    id: '1',
                    title: 'Analyzing income and tax data',
                    icon: 'calculator',
                    contents: [
                        { type: 'text', content: 'I\'ve analyzed your income sources and calculated your tax liability based on Nigerian PAYE tax brackets.' },
                    ],
                },
                {
                    id: '2',
                    title: 'Income breakdown',
                    icon: 'wallet',
                    contents: [
                        {
                            type: 'key-value', content: {
                                'Salary Income': '₦1,850,000',
                                'Other Income': '₦600,000',
                                'Total Gross Income': '₦2,450,000',
                            }
                        },
                    ],
                },
                {
                    id: '3',
                    title: 'Tax calculation',
                    icon: 'receipt',
                    contents: [
                        {
                            type: 'key-value', content: {
                                'Taxable Income': '₦2,405,000',
                                'Effective Tax Rate': '21%',
                                'Monthly Tax': '₦42,088',
                                'Annual Tax': '₦505,050',
                            }
                        },
                    ],
                },
            ],
            charts: [
                {
                    id: 'income-vs-tax',
                    type: 'multi-line',
                    title: 'Income vs Tax Payable (2024)',
                    description: 'Monthly comparison of gross income and tax liability',
                    dateRange: 'Jan - Dec 2024',
                    yKeys: ['income', 'tax'],
                    colors: ['#10b981', '#f59e0b'],
                    data: [
                        { label: 'Jan', income: 180000, tax: 37800 },
                        { label: 'Feb', income: 195000, tax: 40950 },
                        { label: 'Mar', income: 210000, tax: 44100 },
                        { label: 'Apr', income: 185000, tax: 38850 },
                        { label: 'May', income: 220000, tax: 46200 },
                        { label: 'Jun', income: 240000, tax: 50400 },
                        { label: 'Jul', income: 225000, tax: 47250 },
                        { label: 'Aug', income: 250000, tax: 52500 },
                        { label: 'Sep', income: 235000, tax: 49350 },
                        { label: 'Oct', income: 260000, tax: 54600 },
                        { label: 'Nov', income: 245000, tax: 51450 },
                        { label: 'Dec', income: 305000, tax: 64050 },
                    ],
                },
            ],
            sources: [
                { id: '1', title: 'GTBank Statement', type: 'document' },
                { id: '2', title: 'FIRS Tax Tables', type: 'external' },
            ],
            stats: {
                sources: 2,
                words: 178,
                timeSaved: '2h 30min',
                cost: 12.50,
            },
        }
    }

    // Bank charges - includes line chart
    if (lowerMsg.includes('bank') || lowerMsg.includes('charge')) {
        return {
            role: 'assistant',
            content: '',
            responseMode: 'explained',
            sections: [
                {
                    id: '1',
                    title: 'Analyzing bank fees',
                    icon: 'trending-up',
                    contents: [
                        { type: 'text', content: 'I found recurring bank charges in your transaction history.' },
                    ],
                },
                {
                    id: '2',
                    title: 'Bank charges breakdown',
                    icon: 'dollar-sign',
                    contents: [
                        {
                            type: 'key-value', content: {
                                'SMS Alerts': '₦4,800',
                                'Transfer Fees': '₦12,350',
                                'ATM Fees': '₦2,100',
                                'Card Fees': '₦1,200',
                                'Total Charges': '₦20,450',
                            }
                        },
                    ],
                },
            ],
            charts: [
                {
                    id: 'bank-charges-trend',
                    type: 'line',
                    title: 'Bank Charges Trend',
                    description: 'Monthly bank fees over the past year',
                    dateRange: '2024',
                    data: [
                        { label: 'Jan', value: 1500 },
                        { label: 'Feb', value: 1650 },
                        { label: 'Mar', value: 1800 },
                        { label: 'Apr', value: 1700 },
                        { label: 'May', value: 1850 },
                        { label: 'Jun', value: 1600 },
                        { label: 'Jul', value: 1750 },
                        { label: 'Aug', value: 1900 },
                        { label: 'Sep', value: 1650 },
                        { label: 'Oct', value: 1800 },
                        { label: 'Nov', value: 1700 },
                        { label: 'Dec', value: 1950 },
                    ],
                },
            ],
            sources: [
                { id: '1', title: 'Transaction History', type: 'document' },
            ],
            stats: {
                sources: 1,
                words: 89,
                timeSaved: '45min',
                cost: 5.12,
            },
        }
    }

    // Expenses questions - bar chart
    if (lowerMsg.includes('expense') || lowerMsg.includes('spend') || lowerMsg.includes('cost')) {
        return {
            role: 'assistant',
            content: '',
            responseMode: 'explained',
            sections: [
                {
                    id: '1',
                    title: 'Analyzing spending patterns',
                    icon: 'pie-chart',
                    contents: [
                        { type: 'text', content: 'Here\'s a breakdown of your expenses by category for the past year.' },
                    ],
                },
                {
                    id: '2',
                    title: 'Top expense categories',
                    icon: 'wallet',
                    contents: [
                        {
                            type: 'key-value', content: {
                                'Rent & Housing': '₦480,000',
                                'Transportation': '₦156,000',
                                'Food & Groceries': '₦288,000',
                                'Utilities': '₦96,000',
                                'Entertainment': '₦72,000',
                                'Total Expenses': '₦1,092,000',
                            }
                        },
                    ],
                },
            ],
            charts: [
                {
                    id: 'expenses-by-category',
                    type: 'bar',
                    title: 'Monthly Expenses (2024)',
                    description: 'Total spending per month',
                    dateRange: 'Jan - Dec 2024',
                    data: [
                        { label: 'Jan', value: 85000 },
                        { label: 'Feb', value: 92000 },
                        { label: 'Mar', value: 88000 },
                        { label: 'Apr', value: 95000 },
                        { label: 'May', value: 91000 },
                        { label: 'Jun', value: 98000 },
                        { label: 'Jul', value: 87000 },
                        { label: 'Aug', value: 93000 },
                        { label: 'Sep', value: 89000 },
                        { label: 'Oct', value: 96000 },
                        { label: 'Nov', value: 102000 },
                        { label: 'Dec', value: 128000 },
                    ],
                },
            ],
            sources: [
                { id: '1', title: 'Bank Transactions', type: 'document' },
            ],
            stats: {
                sources: 1,
                words: 112,
                timeSaved: '1h 15min',
                cost: 6.80,
            },
        }
    }

    // Savings questions - multi-line chart
    if (lowerMsg.includes('save') || lowerMsg.includes('saving') || lowerMsg.includes('balance')) {
        return {
            role: 'assistant',
            content: '',
            responseMode: 'explained',
            sections: [
                {
                    id: '1',
                    title: 'Analyzing savings patterns',
                    icon: 'target',
                    contents: [
                        { type: 'text', content: 'Here\'s your income vs expenses comparison to show your savings rate.' },
                    ],
                },
                {
                    id: '2',
                    title: 'Savings summary',
                    icon: 'wallet',
                    contents: [
                        {
                            type: 'key-value', content: {
                                'Total Income': '₦2,450,000',
                                'Total Expenses': '₦1,092,000',
                                'Net Savings': '+₦1,358,000',
                                'Savings Rate': '55.4%',
                            }
                        },
                    ],
                },
            ],
            charts: [
                {
                    id: 'income-vs-expenses',
                    type: 'multi-line',
                    title: 'Income vs Expenses (2024)',
                    description: 'Monthly comparison showing your savings gap',
                    dateRange: 'Jan - Dec 2024',
                    yKeys: ['income', 'expenses'],
                    colors: ['#10b981', '#ef4444'],
                    data: [
                        { label: 'Jan', income: 180000, expenses: 85000 },
                        { label: 'Feb', income: 195000, expenses: 92000 },
                        { label: 'Mar', income: 210000, expenses: 88000 },
                        { label: 'Apr', income: 185000, expenses: 95000 },
                        { label: 'May', income: 220000, expenses: 91000 },
                        { label: 'Jun', income: 240000, expenses: 98000 },
                        { label: 'Jul', income: 225000, expenses: 87000 },
                        { label: 'Aug', income: 250000, expenses: 93000 },
                        { label: 'Sep', income: 235000, expenses: 89000 },
                        { label: 'Oct', income: 260000, expenses: 96000 },
                        { label: 'Nov', income: 245000, expenses: 102000 },
                        { label: 'Dec', income: 305000, expenses: 128000 },
                    ],
                },
            ],
            sources: [
                { id: '1', title: 'Bank Statements', type: 'document' },
            ],
            stats: {
                sources: 1,
                words: 95,
                timeSaved: '1h',
                cost: 5.50,
            },
        }
    }

    // Default response
    return {
        role: 'assistant',
        content: '',
        responseMode: 'explained',
        sections: [
            {
                id: '1',
                title: 'Processing request',
                icon: 'file-text',
                contents: [
                    { type: 'text', content: 'I\'ve analyzed your financial documents.' },
                ],
            },
            {
                id: '2',
                title: 'Summary',
                icon: 'trending-up',
                contents: [
                    {
                        type: 'key-value', content: {
                            'Total Income': '₦2,450,000',
                            'Total Expenses': '₦1,890,000',
                            'Net Balance': '₦560,000',
                        }
                    },
                ],
            },
        ],
        stats: {
            sources: 1,
            words: 52,
            timeSaved: '30min',
            cost: 2.50,
        },
    }
}
