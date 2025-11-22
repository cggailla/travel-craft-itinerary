#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import * as React from 'react';
const ReactPDF = require('@react-pdf/renderer');

// Import the TSX BookletDocument so we only use TS/TSX modules
import BookletDocument from './pdf/BookletDocument';

export async function generatePdfFromData(data: any, outputPath: string) {
  const doc = React.createElement(BookletDocument, { data });
  await ReactPDF.render(doc, outputPath);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const input = args[0] || 'extracted.json';
  const output = args[1] || 'booklet.pdf';

  if (!fs.existsSync(input)) {
    console.error('Input JSON not found:', input);
    process.exit(2);
  }
  const data = JSON.parse(fs.readFileSync(input, 'utf8'));
  console.log('Rendering PDF...');
  generatePdfFromData(data, output).then(() => {
    console.log('PDF written to', output);
  }).catch((err: any) => {
    console.error('PDF generation failed:', err);
    process.exit(1);
  });
}
