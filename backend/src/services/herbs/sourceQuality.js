const QUALITY_FLAG_COLUMNS = [
  'quality_missing_identity',
  'quality_duplicate_botanical',
  'quality_has_conflicting_duplicate',
];

export function isSourceQualityFlag(value) {
  if (value === true || value === 1) return true;
  if (typeof value !== 'string') return false;
  return /^(?:1|true|yes)$/i.test(value.trim());
}

export function sourceReviewStatus(row) {
  return QUALITY_FLAG_COLUMNS.some((column) => isSourceQualityFlag(row[column]))
    ? 'draft'
    : 'reviewed';
}
