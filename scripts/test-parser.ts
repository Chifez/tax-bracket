import fs from 'fs';
import 'dotenv/config';
import { parsePdf } from '../src/server/lib/parser.ts';

async function main() {
    const filePath = 'c:/Users/c/Desktop/TaxBracket/public/gtbank_statement.pdf';
    console.log('Reading file:', filePath);
    const buffer = fs.readFileSync(filePath);

    console.log('Parsing file (expecting OCR and LLM to run)...');
    const result = await parsePdf(buffer);

    console.log('\n--- EXTRACTED HEADERS ---');
    console.log(result.headers);
    console.log(`\n--- FIRST 10 PARSED ROWS (${result.rows.length} total) ---`);
    console.log(JSON.stringify(result.rows.slice(0, 10), null, 2));
}

main().catch(console.error);
