import fs from 'fs';
import { createWorker } from 'tesseract.js';
import { pdf as pdfToImg } from 'pdf-to-img';

async function main() {
    const filePath = 'c:/Users/c/Desktop/TaxBracket/public/gtbank_statement.pdf';
    console.log('Reading file:', filePath);
    const buffer = fs.readFileSync(filePath);

    const pages = await pdfToImg(buffer, { scale: 1 });
    let firstPageBuffer;
    for await (const page of pages) {
        firstPageBuffer = page;
        break;
    }

    const worker = await createWorker('eng');
    const ret = await worker.recognize(firstPageBuffer);

    if (ret.data.blocks && ret.data.blocks.length > 0) {
        console.log('Blocks structure:');
        const block = ret.data.blocks[0];
        console.log(Object.keys(block));

        if (block.paragraphs && block.paragraphs.length > 0) {
            const para = block.paragraphs[0];
            console.log('Para keys:', Object.keys(para));
            if (para.lines && para.lines.length > 0) {
                const line = para.lines[0];
                console.log('Line keys:', Object.keys(line));
                if (line.words && line.words.length > 0) {
                    const word = line.words[0];
                    console.log('Word keys:', Object.keys(word));
                    console.log('First word bbox:', word.bbox);
                    console.log('First word text:', word.text);
                }
            }
        }
    } else {
        console.log('No blocks property or empty!');
    }

    await worker.terminate();
}

main().catch(console.error);
