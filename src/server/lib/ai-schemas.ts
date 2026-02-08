import { z } from 'zod'

export const ChartDataSchema = z.object({
    id: z.string().describe('Unique identifier for the chart'),
    type: z.enum(['line', 'bar', 'area', 'multi-line']).describe('Type of chart to render'),
    title: z.string().describe('Title of the chart'),
    description: z.string().optional().describe('Description of what the chart shows'),
    xKey: z.string().describe('Key for the X-axis data'),
    yKeys: z.array(z.string()).describe('Keys for the Y-axis data series'),
    colors: z.array(z.string()).optional().describe('Colors for the data series'),
    data: z.array(z.record(z.string(), z.any())).describe('Array of data points'),
})

export const SectionContentSchema = z.object({
    type: z.enum(['text', 'list', 'key-value', 'chart', 'table']).describe('Type of content in this section'),
    content: z.any().describe('The actual content. For text: string. For list: string[]. For key-value: Record<string, string>.'),
})

export const ResponseSectionSchema = z.object({
    id: z.string().describe('Unique identifier for the section'),
    title: z.string().describe('Section title'),
    icon: z.string().optional().describe('Lucide icon name'),
    contents: z.array(SectionContentSchema).describe('List of content blocks in this section'),
})

export const MessageStatsSchema = z.object({
    sources: z.number().describe('Number of sources used'),
    words: z.number().describe('Word count of the explanation'),
    timeSaved: z.string().optional().describe('Estimated time saved for the user'),
    cost: z.number().optional().describe('Estimated cost of the query'),
})

export const SourceSchema = z.object({
    id: z.string(),
    title: z.string(),
    type: z.enum(['document', 'calculation', 'external']),
    reference: z.string().optional(),
})

// Tool Definitions
export const GenerateStructuredResponseSchema = z.object({
    explanation: z.string().describe('The main text response to the user'),
    sections: z.array(ResponseSectionSchema).optional().describe('Structured sections for deep dives'),
    charts: z.array(ChartDataSchema).optional().describe('Financial charts to visualize data'),
    stats: MessageStatsSchema.optional().describe('Statistics about the response'),
})
