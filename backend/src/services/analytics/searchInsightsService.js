import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../../db/pool.js';

const WEAK_MATCH_RATIO = 0.25;
const ZERO_MATCH_RATIO = 0.2;
const MIN_SAMPLE = 5;

function parseCsvLine(line) {
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

function countPendingVocabRows() {
  const csvPath = process.env.VOCAB_REVIEW_CSV
    || path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../scripts/vocab_review.csv');
  try {
    const text = fs.readFileSync(csvPath, 'utf8');
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return { pending: 0, csvPath };
    const header = parseCsvLine(lines[0]);
    const approvedIdx = header.indexOf('approved_canonical');
    let pending = 0;
    for (let i = 1; i < lines.length; i += 1) {
      const cells = parseCsvLine(lines[i]);
      const approved = (cells[approvedIdx] || '').trim();
      if (!approved) pending += 1;
    }
    return { pending, csvPath };
  } catch {
    return { pending: null, csvPath };
  }
}

/**
 * Read-only improvement hints for experts. Never mutates scoring weights or vocabulary.
 */
export async function buildSearchInsights(days = 90) {
  const windowDays = Math.min(Math.max(Number.parseInt(days, 10) || 90, 1), 365);
  const { rows } = await pool.query(
    `SELECT
       mode,
       COUNT(*)::int AS searches,
       COUNT(*) FILTER (WHERE result_count = 0)::int AS zero_matches,
       COUNT(*) FILTER (WHERE top_match_pct > 0 AND top_match_pct < 40)::int AS weak_matches,
       ROUND(AVG(top_match_pct))::int AS avg_match
     FROM search_events
     WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')
     GROUP BY mode`,
    [windowDays]
  );

  const suggestions = [];

  for (const row of rows) {
    if (row.searches >= MIN_SAMPLE && row.weak_matches / row.searches >= WEAK_MATCH_RATIO) {
      suggestions.push({
        id: `weak-match-${row.mode}`,
        severity: 'review',
        title: `Elevated weak-match rate (${row.mode} search)`,
        detail:
          `${row.weak_matches} of ${row.searches} ${row.mode} searches in the last ${windowDays} days had a top match below 40% (average ${row.avg_match ?? '—'}%). ` +
          'A domain expert may review scoring weights on the Scoring Configuration page. Weights are never changed automatically.',
        requires_expert_approval: true,
        auto_apply: false,
        related_route: '/admin/scoring',
      });
    }
    if (row.searches >= MIN_SAMPLE && row.zero_matches / row.searches >= ZERO_MATCH_RATIO) {
      suggestions.push({
        id: `zero-match-${row.mode}`,
        severity: 'review',
        title: `Frequent zero-result ${row.mode} searches`,
        detail:
          `${row.zero_matches} of ${row.searches} ${row.mode} searches returned no herbs. ` +
          (row.mode === 'simple'
            ? 'Review unmatched query logs and approved vocabulary mappings (suggestions in vocab_review.csv are not approvals).'
            : 'Review whether filter combinations or weights need expert tuning.'),
        requires_expert_approval: true,
        auto_apply: false,
        related_route: row.mode === 'simple' ? '/admin/vocabulary' : '/admin/scoring',
      });
    }
  }

  const vocab = countPendingVocabRows();
  if (vocab.pending != null && vocab.pending > 0) {
    suggestions.push({
      id: 'vocab-review-pending',
      severity: 'info',
      title: 'Vocabulary review queue',
      detail:
        `${vocab.pending} row(s) in vocab_review.csv have no approved_canonical value. ` +
        'Run `npm run vocab:review:report` (backend) for a summary; use `vocab:approved:dry-run` before any apply. Suggestions are not approvals.',
      requires_expert_approval: true,
      auto_apply: false,
      related_route: '/admin/vocabulary',
    });
  }

  return {
    days: windowDays,
    aggregates: rows,
    suggestions,
    disclaimer: 'Suggestions are informational only and require expert approval before data or weight changes.',
  };
}
