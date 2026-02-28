import { ParsedRow, TextItem } from './types'

// -------------------------------------------------------------------
// Type Coercion
// Converts raw strings into proper numbers and ISO date strings.
// Runs on every row after column assignment so downstream consumers
// get typed data instead of everything as strings.
// -------------------------------------------------------------------

export function coerceRowTypes(row: ParsedRow): ParsedRow {
    const result: ParsedRow = {};
    for (const [key, value] of Object.entries(row)) {
        if (typeof value !== 'string') {
            result[key] = value;
            continue;
        }

        const cleaned = value.replace(/,/g, '').trim();

        // Currency / number: strip commas then check for pure numeric
        if (/^-?[\d.]+$/.test(cleaned) && cleaned.length > 0) {
            result[key] = parseFloat(cleaned);
            continue;
        }

        // Date formats: DD/MM/YYYY or DD-MM-YYYY
        if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(value)) {
            const [day, month, year] = value.split(/[\/\-]/);
            const parsed = new Date(`${year}-${month}-${day}`);
            result[key] = isNaN(parsed.getTime()) ? value : parsed.toISOString();
            continue;
        }

        // Date format: YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const parsed = new Date(value);
            result[key] = isNaN(parsed.getTime()) ? value : parsed.toISOString();
            continue;
        }

        result[key] = value;
    }
    return result;
}

// -------------------------------------------------------------------
// Spatial Helpers
// -------------------------------------------------------------------

/**
 * bucketIntoRows — Skew-tolerant 1D Y-axis clustering
 *
 * HOW THIS VERSION FIXES IT — 1D Agglomerative Clustering:
 *
 * Instead of a sequential bounding-box sweep, we:
 *   1. Compute centerY for every token (y - height/2).
 *   2. Sort all tokens globally by centerY, highest first.
 *   3. Derive epsilon = 0.6 × median token height.
 *      - This is data-driven: if OCR reports 18px-tall characters, epsilon ≈ 11px.
 *      - Within a skewed line, words drift by 2–4px max → well within epsilon.
 *      - Between lines, the gap is typically 6–20px+ → above epsilon → new row.
 *   4. Walk sorted tokens. If |currentCenterY - rowMeanY| ≤ epsilon → same row.
 *      Otherwise → flush row, start new one.
 *   5. Track a running mean Y for the current row instead of a fixed anchor.
 *      This handles gradual skew drift across wide lines without error accumulation.
 *
 * Result: a slight physical tilt that shifts word Y-coords by 3–4px no longer
 * splits a 10-word row into 10 separate rows.
 */
export function bucketIntoRows(allTextItems: TextItem[]): TextItem[][] {
    // Filter blanks up front — they contribute nothing but corrupt row boundaries
    const items = allTextItems.filter(item => item.text.trim());
    if (items.length === 0) return [];

    // ── Step 1: Compute centerY for each token ──────────────────────────────
    // Convention inherited from both Tier 1 and Tier 2:
    //   y      = top edge of the bounding box (Y increases upward)
    //   height = positive height of the bounding box
    // Therefore centerY = y - height / 2  (midpoint, below the top edge)
    const withCenter = items.map(item => ({
        item,
        centerY: item.y - Math.abs(item.height || 12) / 2,
    }));

    // ── Step 2: Global top-to-bottom sort ────────────────────────────────────
    // Higher Y value = higher on the page, so sort descending.
    withCenter.sort((a, b) => b.centerY - a.centerY);

    // ── Step 3: Derive epsilon from median token height ──────────────────────
    // We sample ALL token heights, not just the first few, so a document with
    // mixed font sizes (headers + body) still produces a sensible median.
    const heights = items
        .map(i => Math.abs(i.height || 12))
        .filter(h => h > 0)
        .sort((a, b) => a - b);

    const medianHeight = heights.length > 0
        ? heights[Math.floor(heights.length / 2)]
        : 12; // safe fallback for edge cases where height is always 0

    // 0.6× gives enough slack for skew-induced jitter (typically < 0.3× line height)
    // while keeping it tight enough to separate adjacent lines (typically 1–2× apart)
    const epsilon = medianHeight * 0.6;

    console.log(
        `[bucketIntoRows] tokens=${items.length} ` +
        `medianHeight=${medianHeight.toFixed(1)} epsilon=${epsilon.toFixed(1)}`
    );

    // ── Step 4: Agglomerative 1D clustering ─────────────────────────────────
    const rawRows: TextItem[][] = [];
    let currentRow: TextItem[] = [withCenter[0].item];
    console.log(`[DEBUG] Initial token: text="${withCenter[0].item.text}" y=${withCenter[0].item.y} height=${withCenter[0].item.height} centerY=${withCenter[0].centerY}`);
    let rowSumY = withCenter[0].centerY;   // numerator for running mean
    let rowCount = 1;                       // denominator for running mean

    for (let i = 1; i < withCenter.length; i++) {
        const { item, centerY } = withCenter[i];
        const rowMeanY = rowSumY / rowCount;
        const gap = Math.abs(rowMeanY - centerY);

        if (gap <= epsilon) {
            // Same row: update running mean so gradual skew drift doesn't
            // push later tokens outside a fixed anchor point.
            currentRow.push(item);
            rowSumY += centerY;
            rowCount++;
        } else {
            // New row: flush and reset
            rawRows.push([...currentRow]);
            currentRow = [item];
            rowSumY = centerY;
            rowCount = 1;
        }
    }
    if (currentRow.length > 0) rawRows.push(currentRow);

    // ── Step 5: Restore left-to-right reading order within each row ─────────
    rawRows.forEach(row => row.sort((a, b) => a.x - b.x));

    console.log(`[bucketIntoRows] Clustered ${items.length} tokens → ${rawRows.length} rows`);
    return rawRows;
}

export function mergeAdjacentItems(row: TextItem[], gapThreshold = 8): TextItem[] {
    // Items with a horizontal gap < gapThreshold pixels are part of the
    // same word/token and get concatenated into one TextItem.
    // Prevents "1" "," "5" "0" "0" being treated as separate column values
    // instead of a single "1,500".
    if (row.length === 0) return [];
    const merged: TextItem[] = [];
    let current = { ...row[0] };

    for (let j = 1; j < row.length; j++) {
        const next = row[j];
        const gap = next.x - (current.x + current.width);
        if (gap < gapThreshold) {
            current.text += ' ' + next.text;
            current.width = (next.x - current.x) + next.width;
        } else {
            merged.push(current);
            current = { ...next };
        }
    }
    merged.push(current);
    return merged.filter(m => m.text.trim());
}
