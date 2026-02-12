import { db } from '@/db'
import { transactions, taxAggregates } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import {
    calculateTaxLiability,
    calculateDeductions,
    classifyEmployment,
    generateFlags,
} from './tax-calculator'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface IncomeCategories {
    salary: number
    business: number
    rental: number
    investment: number
    other: number
}

interface MonthlyEntry {
    month: string
    income: number
    expenses: number
    bankCharges: number
    netBalance: number
}

// -------------------------------------------------------------------
// Main Aggregation
// -------------------------------------------------------------------

/**
 * Compute all tax-relevant aggregates from the transactions table
 * for a given user and tax year. Persists results to tax_aggregates.
 */
export async function computeAggregates(userId: string, taxYear: number): Promise<void> {
    // 1. Fetch all transactions for this user + year
    const txRows = await db.select()
        .from(transactions)
        .where(
            and(
                eq(transactions.userId, userId),
                eq(transactions.taxYear, taxYear),
            )
        )

    if (txRows.length === 0) {
        console.log(`No transactions found for user ${userId}, year ${taxYear}`)
        return
    }

    // 2. Calculate income categories
    const incomeCategories: IncomeCategories = {
        salary: 0,
        business: 0,
        rental: 0,
        investment: 0,
        other: 0,
    }

    let totalIncome = 0
    let totalExpenses = 0
    let totalBankCharges = 0
    let annualRentPaid = 0
    let annualSalary = 0
    let pensionVisible = false
    let nhfVisible = false
    let nhisAmount = 0
    let lifeInsuranceAmount = 0

    const monthlyMap = new Map<string, MonthlyEntry>()

    for (const tx of txRows) {
        const amount = Number(tx.amount)
        const month = tx.date.toISOString().slice(0, 7) // YYYY-MM

        // Initialize monthly entry
        if (!monthlyMap.has(month)) {
            monthlyMap.set(month, { month, income: 0, expenses: 0, bankCharges: 0, netBalance: 0 })
        }
        const me = monthlyMap.get(month)!

        if (tx.direction === 'credit') {
            totalIncome += amount
            me.income += amount

            switch (tx.category) {
                case 'income':
                    switch (tx.subCategory) {
                        case 'salary': incomeCategories.salary += amount; annualSalary += amount; break
                        case 'business': incomeCategories.business += amount; break
                        case 'rental': incomeCategories.rental += amount; break
                        case 'investment': incomeCategories.investment += amount; break
                        default: incomeCategories.other += amount; break
                    }
                    break
                default:
                    incomeCategories.other += amount
                    break
            }
        } else {
            // Debit
            totalExpenses += amount
            me.expenses += amount

            if (tx.category === 'bank_charges') {
                totalBankCharges += amount
                me.bankCharges += amount
            }

            // Track deduction-relevant transactions
            if (tx.category === 'expense' && tx.subCategory === 'rent') {
                annualRentPaid += amount
            }
            if (tx.category === 'deduction') {
                switch (tx.subCategory) {
                    case 'pension': pensionVisible = true; break
                    case 'nhf': nhfVisible = true; break
                    case 'nhis': nhisAmount += amount; break
                    case 'insurance': lifeInsuranceAmount += amount; break
                }
            }
        }
    }

    // Net balance per month
    for (const entry of monthlyMap.values()) {
        entry.netBalance = Math.round((entry.income - entry.expenses) * 100) / 100
        entry.income = Math.round(entry.income * 100) / 100
        entry.expenses = Math.round(entry.expenses * 100) / 100
        entry.bankCharges = Math.round(entry.bankCharges * 100) / 100
    }

    // Sort monthly breakdown chronologically
    const monthlyBreakdown = Array.from(monthlyMap.values())
        .sort((a, b) => a.month.localeCompare(b.month))

    // 3. Calculate deductions
    const deductions = calculateDeductions({
        annualRentPaid,
        annualSalary,
        pensionVisible,
        nhfVisible,
        nhisAmount,
        lifeInsuranceAmount,
    })

    // 4. Calculate taxable income
    const taxableIncome = Math.max(0, totalIncome - deductions.total)

    // 5. Calculate tax liability
    const taxLiability = calculateTaxLiability(taxableIncome)

    // 6. Classify employment
    const employmentClassification = classifyEmployment(
        incomeCategories.salary,
        incomeCategories.business,
        totalIncome,
    )

    // 7. Generate flags
    const monthsCovered = monthlyMap.size
    const flags = generateFlags({
        totalIncome,
        taxableIncome,
        totalTax: taxLiability.totalTax,
        monthsCovered,
        transactionCount: txRows.length,
        employmentType: employmentClassification,
    })

    // 8. Get current max version
    const existingAggregates = await db.select({ version: taxAggregates.version })
        .from(taxAggregates)
        .where(
            and(
                eq(taxAggregates.userId, userId),
                eq(taxAggregates.taxYear, taxYear),
            )
        )
        .limit(1)

    const newVersion = existingAggregates.length > 0
        ? existingAggregates[0].version + 1
        : 1

    // 9. Invalidate old aggregates
    if (existingAggregates.length > 0) {
        await db.update(taxAggregates)
            .set({ invalidatedAt: new Date() })
            .where(
                and(
                    eq(taxAggregates.userId, userId),
                    eq(taxAggregates.taxYear, taxYear),
                )
            )
    }

    // 10. Insert new aggregate
    await db.insert(taxAggregates).values({
        userId,
        taxYear,
        version: newVersion,
        totalIncome: totalIncome.toFixed(2),
        taxableIncome: taxableIncome.toFixed(2),
        totalExpenses: totalExpenses.toFixed(2),
        totalBankCharges: totalBankCharges.toFixed(2),
        incomeCategories: {
            salary: Math.round(incomeCategories.salary * 100) / 100,
            business: Math.round(incomeCategories.business * 100) / 100,
            rental: Math.round(incomeCategories.rental * 100) / 100,
            investment: Math.round(incomeCategories.investment * 100) / 100,
            other: Math.round(incomeCategories.other * 100) / 100,
        },
        monthlyBreakdown,
        deductions,
        taxLiability,
        employmentClassification,
        flags,
    })

    console.log(`Aggregates computed for user ${userId}, year ${taxYear} (v${newVersion})`)
}
