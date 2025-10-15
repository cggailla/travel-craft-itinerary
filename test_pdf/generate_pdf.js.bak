#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const React = require('react');
const ReactPDF = require('@react-pdf/renderer');

const BookletDocument = require('./pdf/BookletDocument');

function usage() {
  console.log('Usage: node generate_pdf.js <input.json> <output.pdf>');
}

async function main() {
  const args = process.argv.slice(2);
  const input = args[0] || 'extracted.json';
  const output = args[1] || 'booklet.pdf';

  if (!fs.existsSync(input)) {
    console.error('Input JSON not found:', input);
    process.exit(2);
  }

  const data = JSON.parse(fs.readFileSync(input, 'utf8'));

  const doc = React.createElement(BookletDocument, { data });

  // render to file
  console.log('Rendering PDF...');
  try {
    await ReactPDF.render(doc, output);
    console.log('PDF written to', output);
  } catch (err) {
    console.error('PDF generation failed:', err);
    process.exit(1);
  }
}

if (require.main === module) main();
