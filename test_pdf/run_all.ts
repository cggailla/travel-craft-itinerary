#!/usr/bin/env node
import * as path from 'path';
import * as fs from 'fs';
import { extractFromHtml } from './scripts/extract';
import { generatePdfFromData } from './generate_pdf';

async function main() {
  const argv = process.argv.slice(2);
  const inputHtml = argv[0] || 'dom.html';
  const outputPdf = argv[1] || 'booklet.pdf';
  const cwd = path.resolve(__dirname);

  const inputPath = path.resolve(cwd, inputHtml);

  if (!fs.existsSync(inputPath)) {
    console.error('Input file not found:', inputPath);
    process.exit(2);
  }

  console.log("1/2 — Exécution de l'extracteur HTML → mémoire");
  let data: any;
  try {
    const html = fs.readFileSync(inputPath, 'utf8');
    data = extractFromHtml(html);
    console.log('Extraction complete. (in-memory)');
  } catch (err: any) {
    console.error('Extraction failed:', err.message || err);
    process.exit(1);
  }

  console.log('2/2 — Génération du PDF depuis l’objet extrait (en mémoire)');
  try {
    await generatePdfFromData(data, path.resolve(cwd, outputPdf));
    console.log('PDF written to', path.resolve(cwd, outputPdf));
  } catch (err: any) {
    console.error('PDF generation failed:', err.message || err);
    process.exit(1);
  }
}

if (require.main === module) main();
