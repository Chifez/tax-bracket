import { db } from '@/db'
import { taxAggregates, taxContext, files } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import type { CompactTaxContext } from '@/db/schema/tax-context'

// -------------------------------------------------------------------
// Token Estimation
// -------------------------------------------------------------------

/**
 * Rough token estimate for a JSON object.
 * ~4 chars per token for English text / JSON keys.
 */
function estimateTokens(obj: any): number {
    const json = JSON.stringify(obj)
    return Math.ceil(json.length / 4)
}

// -------------------------------------------------------------------
// Context Builder
// -------------------------------------------------------------------

/**
 * Build a compact tax context object (~200 tokens) from the latest
 * valid tax_aggregates for a given user and tax year.
 * Persists result to the tax_context table.
 */
export async function buildContext(userId: string, taxYear: number): Promise<CompactTaxContext | null> {
    // 1. Get the latest non-invalidated aggregate
    const aggregate = await db.select()
        .from(taxAggregates)
        .where(
            and(
                eq(taxAggregates.userId, userId),
                eq(taxAggregates.taxYear, taxYear),
                isNull(taxAggregates.invalidatedAt),
            )
        )
        .limit(1)

    if (aggregate.length === 0) {
        console.log(`No valid aggregates for user ${userId}, year ${taxYear}`)
        return null
    }

    const agg = aggregate[0]

    // 2. Count files for upload status
    const fileRows = await db.select({ id: files.id, status: files.status })
        .from(files)
        .where(
            and(
                eq(files.userId, userId),
                eq(files.taxYear, taxYear),
            )
        )

    const totalFiles = fileRows.length
    const completedFiles = fileRows.filter(f => f.status === 'completed').length
    const processingFiles = fileRows.filter(f => f.status === 'processing').length

    let uploadStatus = `${totalFiles} file${totalFiles !== 1 ? 's' : ''}`
    if (processingFiles > 0) {
        uploadStatus += `, ${processingFiles} processing`
    } else if (completedFiles === totalFiles) {
        uploadStatus += ', fully processed'
    }

    // 3. Determine months covered
    const monthly = agg.monthlyBreakdown as Array<{ month: string }> | null
    let dataMonths = 'No data'
    if (monthly && monthly.length > 0) {
        const months = monthly.map(m => m.month).sort()
        const firstMonth = months[0]
        const lastMonth = months[months.length - 1]
        // Convert YYYY-MM to short form
        const toShort = (ym: string) => {
            const [y, m] = ym.split('-')
            const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            return `${names[parseInt(m) - 1]} ${y}`
        }
        dataMonths = firstMonth === lastMonth
            ? toShort(firstMonth)
            : `${toShort(firstMonth)} – ${toShort(lastMonth)}`
    }

    // 4. Build income sources array (non-zero only)
    const cats = agg.incomeCategories as any || {}
    const incomeSources: { type: string; total: number }[] = []
    for (const [type, total] of Object.entries(cats)) {
        if (typeof total === 'number' && total > 0) {
            incomeSources.push({ type, total })
        }
    }
    // Sort by amount descending
    incomeSources.sort((a, b) => b.total - a.total)

    // 5. Build compact context
    const liability = agg.taxLiability as any || {}
    const context: CompactTaxContext = {
        taxYear,
        incomeSources,
        totalIncome: Number(agg.totalIncome),
        taxableIncome: Number(agg.taxableIncome),
        estimatedTax: liability.totalTax ?? 0,
        effectiveRate: `${liability.effectiveRate ?? 0}%`,
        employmentType: agg.employmentClassification || 'paye',
        bankCharges: Number(agg.totalBankCharges),
        flags: (agg.flags as string[]) || [],
        uploadStatus,
        dataMonths,
    }

    const tokenEstimate = estimateTokens(context)

    // 6. Upsert into tax_context
    const existing = await db.select({ id: taxContext.id, version: taxContext.version })
        .from(taxContext)
        .where(
            and(
                eq(taxContext.userId, userId),
                eq(taxContext.taxYear, taxYear),
            )
        )
        .limit(1)

    if (existing.length > 0) {
        await db.update(taxContext)
            .set({
                contextJson: context,
                tokenEstimate,
                version: existing[0].version + 1,
            })
            .where(eq(taxContext.id, existing[0].id))
    } else {
        await db.insert(taxContext).values({
            userId,
            taxYear,
            version: 1,
            contextJson: context,
            tokenEstimate,
        })
    }

    console.log(`Tax context built for user ${userId}, year ${taxYear} (~${tokenEstimate} tokens)`)
    return context
}
