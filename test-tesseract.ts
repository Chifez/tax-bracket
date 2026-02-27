import fs from 'fs';
import path from 'path';
import { parsePdf } from './src/server/lib/parser';

async function main() {
    try {
        const filePath = path.join(process.cwd(), 'public', 'gtbank_statement.pdf');
        console.log(`Loading PDF from: ${filePath}`);
        
        if (!fs.existsSync(filePath)) {
             console.error('File not found!');
             return;
        }

        const buffer = fs.readFileSync(filePath);

        console.log('--- Starting parsePdf ---');
        const result = await parsePdf(buffer);
        console.log('--- Finished parsePdf ---');
        
        console.log(`Extracted rawText length: ${result.rawText.length}`);
        console.log(`Extracted structured rows: ${result.rows.length}`);
        
        const previewText = result.rawText.substring(0, 1000);
        console.log('--- rawText Preview ---');
        console.log(previewText);

    } catch (e) {
        console.error('Error during parsing:');
        console.error(e);
    }
}

main();
