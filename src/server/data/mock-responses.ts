export const MOCK_RESPONSES = {
    GREETING: {
        content: "Hello! I'm your TaxBracket AI assistant. I can help you analyze your financial documents, calculate taxes, and identify deductions. Upload a bank statement or financial record to get started!",
        sections: [
            {
                id: 'welcome-1',
                title: 'Getting Started',
                icon: 'Zap',
                contents: [{ type: 'text', content: 'Upload a PDF or CSV file of your bank statement to begin analysis.' }]
            }
        ],
        stats: { sources: 0, words: 30 }
    },
    NO_FILE_TAX_BANK: {
        content: "I see you're asking about financial details. To provide an accurate analysis of your taxes or bank charges, I need access to your transaction history. Please upload your bank statement or relevant financial documents.",
        sections: [],
        stats: { sources: 0, words: 35 }
    },
    FILE_TAX: {
        content: "I've analyzed your uploaded documents to estimate your tax liability. Based on your income streams and standard tax brackets, here is the breakdown for the year.",
        sections: [
            {
                id: 'tax-calc-1',
                title: 'Tax Liability Calculation',
                icon: 'Calculator',
                contents: [
                    {
                        type: 'key-value',
                        content: {
                            'Total Taxable Income': '$145,200.00',
                            'Estimated Tax (24%)': '$34,848.00',
                            'Effective Tax Rate': '19.2%',
                            'Tax Owed': '$4,200.00'
                        }
                    },
                    { type: 'text', content: 'This calculation assumes a standard deduction and single filing status. Please consult a tax professional for a final determination.' }
                ]
            }
        ],
        charts: [
            {
                id: 'tax-trend-1',
                type: 'line',
                title: 'Monthly Earnings vs Estimated Tax',
                description: 'Comparison of gross monthly income against estimated tax set aside.',
                xKey: 'month',
                yKeys: ['earnings', 'tax'],
                colors: ['#22c55e', '#f97316'],
                data: [
                    { month: 'Jan', earnings: 11500, tax: 2760 },
                    { month: 'Feb', earnings: 12200, tax: 2928 },
                    { month: 'Mar', earnings: 10800, tax: 2592 },
                    { month: 'Apr', earnings: 11900, tax: 2856 },
                    { month: 'May', earnings: 13000, tax: 3120 },
                    { month: 'Jun', earnings: 12500, tax: 3000 },
                    { month: 'Jul', earnings: 11200, tax: 2688 },
                    { month: 'Aug', earnings: 11800, tax: 2832 },
                    { month: 'Sep', earnings: 12100, tax: 2904 },
                    { month: 'Oct', earnings: 13500, tax: 3240 },
                    { month: 'Nov', earnings: 12800, tax: 3072 },
                    { month: 'Dec', earnings: 11900, tax: 2856 }
                ]
            }
        ],
        stats: { sources: 1, words: 85, timeSaved: '15m' }
    },
    FILE_BANK: {
        content: "I've scanned your statements for bank charges and fees. Here is a summary of the monthly charges deducted from your account.",
        sections: [
            {
                id: 'bank-fees-1',
                title: 'Bank Fees Analysis',
                icon: 'CreditCard',
                contents: [
                    {
                        type: 'key-value',
                        content: {
                            'Total Annual Fees': '$435.50',
                            'Average Monthly Fee': '$36.29',
                            'Highest Fee Month': 'October ($55.00)'
                        }
                    },
                    { type: 'text', content: 'Fees include monthly maintenance charges, overdraft fees, and wire transfer costs.' }
                ]
            }
        ],
        charts: [
            {
                id: 'fees-trend-1',
                type: 'line',
                title: 'Monthly Bank Charges',
                description: 'Trend of bank fees paid over the last 12 months.',
                xKey: 'month',
                yKeys: ['fees'],
                colors: ['#ef4444'],
                data: [
                    { month: 'Jan', fees: 25.00 },
                    { month: 'Feb', fees: 25.00 },
                    { month: 'Mar', fees: 35.00 },
                    { month: 'Apr', fees: 25.00 },
                    { month: 'May', fees: 45.00 },
                    { month: 'Jun', fees: 25.00 },
                    { month: 'Jul', fees: 30.00 },
                    { month: 'Aug', fees: 25.00 },
                    { month: 'Sep', fees: 40.00 },
                    { month: 'Oct', fees: 55.00 },
                    { month: 'Nov', fees: 25.00 },
                    { month: 'Dec', fees: 35.00 }
                ]
            }
        ],
        stats: { sources: 1, words: 60, timeSaved: '5m' }
    },
    FILE_OVERVIEW: {
        content: "Here is a comprehensive overview of your financial health for the year, comparing your income against expenses and net savings.",
        sections: [
            {
                id: 'fin-health-1',
                title: 'Financial Health Summary',
                icon: 'Activity',
                contents: [
                    {
                        type: 'key-value',
                        content: {
                            'Total Income': '$145,200',
                            'Total Expenses': '$89,450',
                            'Net Savings': '$55,750',
                            'Savings Rate': '38.4%'
                        }
                    }
                ]
            }
        ],
        charts: [
            {
                id: 'income-expense-1',
                type: 'bar',
                title: 'Income vs Expenses',
                description: 'Monthly comparison of inflow and outflow.',
                xKey: 'month',
                yKeys: ['income', 'expenses'],
                colors: ['#22c55e', '#ef4444'],
                data: [
                    { month: 'Jan', income: 11500, expenses: 7200 },
                    { month: 'Feb', income: 12200, expenses: 6800 },
                    { month: 'Mar', income: 10800, expenses: 7500 },
                    { month: 'Apr', income: 11900, expenses: 7100 },
                    { month: 'May', income: 13000, expenses: 8200 },
                    { month: 'Jun', income: 12500, expenses: 7600 },
                    { month: 'Jul', income: 11200, expenses: 6900 },
                    { month: 'Aug', income: 11800, expenses: 7300 },
                    { month: 'Sep', income: 12100, expenses: 7400 },
                    { month: 'Oct', income: 13500, expenses: 8500 },
                    { month: 'Nov', income: 12800, expenses: 7800 },
                    { month: 'Dec', income: 11900, expenses: 7150 }
                ]
            }
        ],
        stats: { sources: 1, words: 50, timeSaved: '10m' }
    },
    FILE_DEDUCTIONS: {
        content: "I've identified several potential tax deductions from your transaction history. These could help lower your taxable income.",
        sections: [
            {
                id: 'deductions-1',
                title: 'Potential Deductions',
                icon: 'FileText',
                contents: [
                    {
                        type: 'list',
                        content: [
                            'Home Office Expenses (Internet, Utilities)',
                            'Charitable Donations (Red Cross, Local Shelter)',
                            'Professional Development (Online Courses)',
                            'Medical Expenses (Pharmacy, Doctor Visits)'
                        ]
                    },
                    {
                        type: 'key-value',
                        content: {
                            'Est. Home Office': '$1,200',
                            'Est. Charity': '$550',
                            'Est. Education': '$890'
                        }
                    }
                ]
            }
        ],
        stats: { sources: 1, words: 45, timeSaved: '8m' }
    },
    DEFAULT: {
        content: "I'm not sure how to help with that specifically, but I can help you analyze financial documents, calculate taxes, or identify deductions. Try asking 'Calculate my tax' or 'Show my bank fees' after uploading a file.",
        sections: [],
        stats: { sources: 0, words: 40 }
    }
}
