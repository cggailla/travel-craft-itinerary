#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function runNodeScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const node = process.execPath; // node executable
    const child = spawn(node, [scriptPath, ...args], { stdio: 'inherit' });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(scriptPath)} exited with code ${code}`));
    });
    child.on('error', (err) => reject(err));
  });
}

async function main() {
  const argv = process.argv.slice(2);
  const inputHtml = argv[0] || 'dom.html';
  const outputPdf = argv[1] || 'booklet.pdf';
  const cwd = path.resolve(__dirname);

  const extractScript = path.join(cwd, 'scripts', 'extract.js');
  const extractedJson = path.join(cwd, 'extracted.json');
  const genScript = path.join(cwd, 'generate_pdf.js');

  if (!fs.existsSync(extractScript)) {
    console.error('extract script not found:', extractScript);
    process.exit(2);
  }
  if (!fs.existsSync(genScript)) {
    console.error('generate_pdf script not found:', genScript);
    process.exit(2);
  }

  console.log('1/2 — Exécution de l\'extracteur HTML → JSON');
  try {
    await runNodeScript(extractScript, [inputHtml, extractedJson]);
  } catch (err) {
    console.error('Extraction failed:', err.message || err);
    process.exit(1);
  }

  if (!fs.existsSync(extractedJson)) {
    console.error('Extraction did not produce JSON:', extractedJson);
    process.exit(1);
  }

  console.log('2/2 — Génération du PDF depuis le JSON');
  try {
    await runNodeScript(genScript, [extractedJson, outputPdf]);
  } catch (err) {
    console.error('PDF generation failed:', err.message || err);
    process.exit(1);
  }

  console.log('Done — PDF écrit dans', path.resolve(cwd, outputPdf));
}

if (require.main === module) main();
