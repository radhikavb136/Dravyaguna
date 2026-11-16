/**
 * Summarize vocab_review.csv for domain review (no DB writes).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = process.env.VOCAB_REVIEW_CSV
  ? path.resolve(process.env.VOCAB_REVIEW_CSV)
  : path.join(__dirname, 'vocab_review.csv');

function parseLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells;
}

function parseArgs(argv) {
  const opts = { exportPending: null, exportLimit: 200 };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--export-pending=')) {
      opts.exportPending = arg.slice('--export-pending='.length);
    } else if (arg === '--export-pending' && argv[i + 1]) {
      opts.exportPending = argv[++i];
    } else if (arg.startsWith('--limit=')) {
      opts.exportLimit = Number.parseInt(arg.slice('--limit='.length), 10) || opts.exportLimit;
    }
  }
  return opts;
}

function main() {
  const cli = parseArgs(process.argv);
  const text = fs.readFileSync(csvPath, 'utf8');
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = parseLine(lines[0]);
  const idx = {
    category: header.indexOf('category'),
    raw: header.indexOf('raw_token'),
    count: header.indexOf('count'),
    suggestion: header.indexOf('suggestion'),
    approved: header.indexOf('approved_canonical'),
  };

  const byCategory = {};
  let approved = 0;
  let withSuggestion = 0;
  let pending = 0;
  const topPending = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseLine(lines[i]);
    const category = (cells[idx.category] || '').trim();
    const raw = (cells[idx.raw] || '').trim();
    const count = Number(cells[idx.count] || 0);
    const suggestion = (cells[idx.suggestion] || '').trim();
    const approvedCanonical = (cells[idx.approved] || '').trim();
    byCategory[category] = (byCategory[category] || 0) + 1;
    if (approvedCanonical) {
      approved += 1;
      continue;
    }
    pending += 1;
    if (suggestion) withSuggestion += 1;
    topPending.push({ category, raw, count, suggestion });
  }

  topPending.sort((a, b) => b.count - a.count);

  if (cli.exportPending) {
    const outPath = path.resolve(cli.exportPending);
    const headerLine = lines[0];
    const pendingRows = [];
    for (let i = 1; i < lines.length; i += 1) {
      const cells = parseLine(lines[i]);
      const approvedCanonical = (cells[idx.approved] || '').trim();
      if (!approvedCanonical) pendingRows.push(lines[i]);
    }
    const slice = pendingRows.slice(0, cli.exportLimit);
    fs.writeFileSync(outPath, `${headerLine}\n${slice.join('\n')}\n`, 'utf8');
    console.log(JSON.stringify({
      exported: slice.length,
      total_pending: pendingRows.length,
      path: outPath,
      note: 'approved_canonical column is empty; fill only from domain-approved sources before vocab:approved:apply.',
    }, null, 2));
    return;
  }

  console.log(JSON.stringify({
    csv: csvPath,
    total_rows: lines.length - 1,
    by_category: byCategory,
    approved_canonical_set: approved,
    pending_approval: pending,
    pending_with_suggestion_only: withSuggestion,
    note: 'Fill approved_canonical only from domain-approved sources; suggestions are not auto-applied.',
    top_pending: topPending.slice(0, 15),
  }, null, 2));
}

main();
