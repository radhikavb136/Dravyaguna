const DOSAGE_PATTERN = /\b\d+\s*(mg|g|ml|mcg|grams?|milligrams?)\b/i;
const PRESCRIPTION_PATTERN = /\b(take|dose|dosage)\s+\d+/i;

/**
 * Reject obviously unsafe or unusable model output before returning to clients.
 */
export function validateGeneratedExplanation(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return { ok: false, reason: 'empty' };
  if (trimmed.length < 20) return { ok: false, reason: 'too_short' };
  if (trimmed.length > 1200) return { ok: false, reason: 'too_long' };
  if (DOSAGE_PATTERN.test(trimmed) || PRESCRIPTION_PATTERN.test(trimmed)) {
    return { ok: false, reason: 'unsupported_clinical_claim' };
  }
  return { ok: true };
}
