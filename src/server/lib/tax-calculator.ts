// -------------------------------------------------------------------
// Nigerian Tax Calculator — Nigeria Tax Act 2025
// Effective January 1, 2026
// DETERMINISTIC — No AI, No Estimation
// -------------------------------------------------------------------

// -------------------------------------------------------------------
// Tax Brackets
// -------------------------------------------------------------------

export interface TaxBracket {
    min: number
    max: number       // Infinity for the last bracket
    rate: number      // decimal, e.g., 0.15
    label: string
}

export const NIGERIAN_TAX_BRACKETS_2026: TaxBracket[] = [
    { min: 0, max: 800_000, rate: 0.00, label: '₦0 – ₦800,000' },
    { min: 800_001, max: 3_000_000, rate: 0.15, label: '₦800,001 – ₦3,000,000' },
    { min: 3_000_001, max: 12_000_000, rate: 0.18, label: '₦3,000,001 – ₦12,000,000' },
    { min: 12_000_001, max: 25_000_000, rate: 0.21, label: '₦12,000,001 – ₦25,000,000' },
    { min: 25_000_001, max: 50_000_000, rate: 0.23, label: '₦25,000,001 – ₦50,000,000' },
    { min: 50_000_001, max: Infinity, rate: 0.25, label: 'Above ₦50,000,000' },
]

// -------------------------------------------------------------------
// Tax Liability Calculation
// -------------------------------------------------------------------

export interface BracketResult {
    range: string
    rate: number
    taxable: number
    tax: number
}

export interface TaxLiabilityResult {
    brackets: BracketResult[]
    totalTax: number
    effectiveRate: number     // percentage
    monthlyEstimate: number
}

/**
 * Calculate tax liability using progressive brackets.
 * @param taxableIncome - Income after all deductions
 */
export function calculateTaxLiability(taxableIncome: number): TaxLiabilityResult {
    if (taxableIncome <= 0) {
        return {
            brackets: [],
            totalTax: 0,
            effectiveRate: 0,
            monthlyEstimate: 0,
        }
    }

    const brackets: BracketResult[] = []
    let totalTax = 0
    let remaining = taxableIncome

    for (const bracket of NIGERIAN_TAX_BRACKETS_2026) {
        if (remaining <= 0) break

        const bracketSize = bracket.max === Infinity
            ? remaining
            : bracket.max - bracket.min + 1

        const taxableInBracket = Math.min(remaining, bracketSize)
        const tax = Math.round(taxableInBracket * bracket.rate * 100) / 100

        brackets.push({
            range: bracket.label,
            rate: bracket.rate,
            taxable: taxableInBracket,
            tax,
        })

        totalTax += tax
        remaining -= taxableInBracket
    }

    totalTax = Math.round(totalTax * 100) / 100

    return {
        brackets,
        totalTax,
        effectiveRate: taxableIncome > 0
            ? Math.round((totalTax / taxableIncome) * 1000) / 10
            : 0,
        monthlyEstimate: Math.round((totalTax / 12) * 100) / 100,
    }
}

// -------------------------------------------------------------------
// Deductions & Relief
// -------------------------------------------------------------------

export interface DeductionsResult {
    rentRelief: number
    pension: number
    nhf: number
    nhis: number
    lifeInsurance: number
    total: number
}

/**
 * Calculate allowable deductions.
 * @param annualRentPaid - Total rent paid in the year
 * @param annualSalary   - Gross salary (for pension / NHF calc)
 * @param pensionVisible - Whether pension deduction is visible in transactions
 * @param nhfVisible     - Whether NHF is visible
 */
export function calculateDeductions(params: {
    annualRentPaid?: number
    annualSalary?: number
    pensionVisible?: boolean
    nhfVisible?: boolean
    nhisAmount?: number
    lifeInsuranceAmount?: number
}): DeductionsResult {
    const {
        annualRentPaid = 0,
        annualSalary = 0,
        pensionVisible = false,
        nhfVisible = false,
        nhisAmount = 0,
        lifeInsuranceAmount = 0,
    } = params

    // Rent Relief: lesser of ₦500,000 or 20% of annual rent
    const rentRelief = annualRentPaid > 0
        ? Math.min(500_000, annualRentPaid * 0.20)
        : 0

    // Pension: 8% of salary (employee contribution)
    const pension = pensionVisible ? annualSalary * 0.08 : 0

    // NHF: 2.5% of basic salary
    const nhf = nhfVisible ? annualSalary * 0.025 : 0

    const total = Math.round((rentRelief + pension + nhf + nhisAmount + lifeInsuranceAmount) * 100) / 100

    return {
        rentRelief: Math.round(rentRelief * 100) / 100,
        pension: Math.round(pension * 100) / 100,
        nhf: Math.round(nhf * 100) / 100,
        nhis: nhisAmount,
        lifeInsurance: lifeInsuranceAmount,
        total,
    }
}

// -------------------------------------------------------------------
// Employment Classification
// -------------------------------------------------------------------

export type EmploymentType = 'paye' | 'self-employed' | 'mixed'

/**
 * Classify employment type based on income sources.
 * - PAYE: >80% from salary
 * - Self-employed: >80% from business
 * - Mixed: otherwise
 */
export function classifyEmployment(
    salaryIncome: number,
    businessIncome: number,
    totalIncome: number,
): EmploymentType {
    if (totalIncome <= 0) return 'paye'

    const salaryPct = salaryIncome / totalIncome
    const businessPct = businessIncome / totalIncome

    if (salaryPct > 0.8) return 'paye'
    if (businessPct > 0.8) return 'self-employed'
    return 'mixed'
}

// -------------------------------------------------------------------
// Threshold Checks & Flags
// -------------------------------------------------------------------

export function generateFlags(params: {
    totalIncome: number
    taxableIncome: number
    totalTax: number
    monthsCovered: number
    transactionCount: number
    employmentType: EmploymentType
}): string[] {
    const flags: string[] = []

    // Income below minimum wage threshold
    const ANNUAL_MIN_WAGE = 70_000 * 12 // ₦840,000
    if (params.totalIncome > 0 && params.totalIncome < ANNUAL_MIN_WAGE) {
        flags.push('Income below national minimum wage (₦840,000/year)')
    }

    // Tax-free bracket
    if (params.taxableIncome <= 800_000) {
        flags.push('Taxable income within zero-rate bracket (≤₦800,000)')
    }

    // Partial year data
    if (params.monthsCovered < 12) {
        flags.push(`Data covers ${params.monthsCovered} of 12 months — income may be extrapolated`)
    }

    // Few transactions
    if (params.transactionCount < 10) {
        flags.push('Limited transaction data — results may not reflect full financial picture')
    }

    // High income bracket
    if (params.taxableIncome > 50_000_000) {
        flags.push('Income exceeds ₦50M — top bracket (25%) applies')
    }

    return flags
}
