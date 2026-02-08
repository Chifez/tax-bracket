
/**
 * Parses Vercel AI Data Stream Protocol chunks.
 * Specifically handles '9:' (start tool) and 'b:' (tool delta) parts.
 */
export function parseStreamPart(chunk: string): { type: string, value: any } | null {
    const colonIndex = chunk.indexOf(':');
    if (colonIndex === -1) return null;

    const type = chunk.substring(0, colonIndex);
    const content = chunk.substring(colonIndex + 1);

    try {
        if (type === '0') {
            return { type: 'text', value: JSON.parse(content) };
        } else if (type === '9') { // Tool call start
            return { type: 'tool_start', value: JSON.parse(content) };
        } else if (type === 'b') { // Tool call delta
            return { type: 'tool_delta', value: JSON.parse(content) };
        }
    } catch (e) {
        // console.error('Error parsing stream chunk', e);
    }
    return null;
}
