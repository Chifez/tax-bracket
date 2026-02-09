

// --- 1. Text Block ---
export interface TextBlock {
    type: 'text'
    content: string // Strict plain text
}

// --- 2. Section Block ---
// Re-using existing structure for compatibility but strict typing
export interface SectionContent {
    type: 'text' | 'list' | 'key-value' | 'table'
    content: string | string[] | Record<string, string> | any[]
}

export interface SectionBlock {
    type: 'section'
    id: string
    title: string
    icon: string // Icon name string, mapped to component in renderer
    contents: SectionContent[]
}

// --- 3. Chart Block ---
export interface ChartBlock {
    type: 'chart'
    id: string
    chartType: 'line' | 'bar' | 'area'
    title: string
    description: string
    xKey: string
    yKeys: string[]
    colors: string[]
    data: Record<string, any>[]
}

// --- 4. Stats Block ---
export interface StatsBlock {
    type: 'stats'
    sources?: number
    words?: number
    timeSaved?: string
}

// --- Base Union ---
export type UIBlock = TextBlock | SectionBlock | ChartBlock | StatsBlock

// --- Source Model ---
export interface Source {
    id: string
    title: string
    url: string
    type: 'pdf' | 'csv' | 'text'
}

// --- Structured Response Model ---
export interface StructuredResponse {
    blocks: UIBlock[]
    sources?: Source[]
}
