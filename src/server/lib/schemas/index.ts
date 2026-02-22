import { tool } from 'ai'
import { z } from 'zod'

export const complexSchema = tool({
    description: 'Generates an ordered list of UI blocks (text, sections, charts, data tables, stats) for the response. Use data-table blocks for tabular data like transaction lists, tax breakdowns, and comparisons.',
    inputSchema: z.object({
        blocks: z.array(z.object({
            type: z.enum(['text', 'section', 'chart', 'data-table', 'stats']).describe('The type of UI block. Use data-table for tabular data.'),
            content: z.string().optional().describe('For text blocks only: Plain text content (NO Markdown)'),
            id: z.string().optional().describe('For section/chart/data-table blocks'),
            title: z.string().optional().describe('For section/chart/data-table blocks'),
            icon: z.string().optional().describe('For section blocks: Lucide icon name'),
            contents: z.array(z.any()).optional().describe('For section blocks: Array of content items'),
            chartType: z.enum(['line', 'bar', 'area']).optional().describe('For chart blocks'),
            description: z.string().optional().describe('For chart/data-table blocks'),
            xKey: z.string().optional().describe('For chart blocks'),
            yKeys: z.array(z.string()).optional().describe('For chart blocks'),
            colors: z.array(z.string()).optional().describe('For chart blocks'),
            data: z.array(z.record(z.string(), z.any())).optional().describe('For chart blocks'),
            columns: z.array(z.string()).optional().describe('For data-table blocks: Column header names'),
            rows: z.array(z.array(z.union([z.string(), z.number()]))).optional().describe('For data-table blocks: Array of row data, each row is an array of cell values matching columns order'),
            sources: z.number().optional().describe('For stats blocks: Number of sources'),
            words: z.number().optional().describe('For stats blocks: Word count'),
            timeSaved: z.string().optional().describe('For stats blocks: Time saved'),
        })),
        sources: z.array(z.object({
            id: z.string(),
            title: z.string(),
            url: z.string(),
            type: z.enum(['pdf', 'csv', 'text'])
        })).optional()
    })
})

export const simpleSchema = tool({
    description: 'Generates a simple response with text blocks. Use this for greetings, short answers, or when no complex data visualization is needed.',
    inputSchema: z.object({
        blocks: z.array(z.object({
            type: z.enum(['text', 'section']).describe('Use text for paragraphs. Use section for simple lists.'),
            content: z.string().optional().describe('For text blocks: Plain text content.'),
            title: z.string().optional().describe('For section blocks: Title of the list'),
            icon: z.string().optional().describe('For section blocks: Optional icon'),
            contents: z.array(z.object({
                type: z.enum(['text', 'list']),
                content: z.union([z.string(), z.array(z.string())])
            })).optional().describe('For section blocks: Simple content items')
        }))
    })
})
