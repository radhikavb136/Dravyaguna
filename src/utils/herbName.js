/**
 * Herb name localization utility.
 * When the active interface language is Sanskrit (sa-IN / sa / Sanskrit),
 * herb display defaults to its classical Sanskrit name from the dataset.
 */

export function isSanskritLanguage(language) {
  if (!language) {
    if (typeof window !== 'undefined') {
      language = localStorage.getItem('dravyaguna-language') || 'en-IN';
    } else {
      language = 'en-IN';
    }
  }
  const normalized = String(language).toLowerCase().trim();
  return normalized === 'sa-in' || normalized === 'sa' || normalized === 'sanskrit';
}

export function getHerbDisplayName(herb, language) {
  if (!herb) return '';
  const inSanskrit = isSanskritLanguage(language);

  if (inSanskrit) {
    const sanskrit = (herb.sanskritName || herb.sanskrit_name || '').trim();
    if (sanskrit) return sanskrit;
  }

  return (herb.englishName || herb.english_name || herb.sanskritName || herb.sanskrit_name || 'Unnamed herb').trim();
}

export function getHerbSecondaryName(herb, language) {
  if (!herb) return '';
  const inSanskrit = isSanskritLanguage(language);

  if (inSanskrit) {
    // When title is Sanskrit, subtitle shows English name & Botanical name
    const english = (herb.englishName || herb.english_name || '').trim();
    const botanical = (herb.botanicalName || herb.botanical_name || '').trim();
    if (english && botanical && english.toLowerCase() !== botanical.toLowerCase()) {
      return `${english} (${botanical})`;
    }
    return english || botanical || '';
  }

  return (herb.botanicalName || herb.botanical_name || herb.sanskritName || herb.sanskrit_name || '').trim();
}
