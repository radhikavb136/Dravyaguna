export function prepareHerbForCard(herb, match, displayLanguage = "en-IN") {
  const partUsed = herb.partUsed
  const indications = herb.indications || []
  return {
    ...herb,
    englishName: herb.englishName || herb.name,
    botanicalName: herb.botanicalName || herb.scientificName,
    partUsed,
    prabhava: herb.prabhava,
    verificationStatus: herb.verificationStatus || herb.status,
    regionalNames: herb.regionalNames || [],
    rasa: herb.rasa || [],
    guna: herb.guna || [],
    virya: herb.virya,
    vipaka: herb.vipaka,
    dosha: herb.dosha || {},
    dhatu: herb.dhatu || [],
    mala: herb.mala || [],
    srotas: herb.srotas || [],
    avayava: herb.avayava || [],
    karma: herb.karma || [],
    indications,
    match,
    displayLanguage,
    description: `Part used: ${partUsed || "Not specified"}. Indications: ${Array.isArray(indications) ? indications.join(", ") : indications || "Not specified"}.`,
  }
}

export function prepareApiResultsForCards(results, displayLanguage = "en-IN") {
  return (results || []).map((herb) =>
    prepareHerbForCard(herb, herb.matchPercentage ?? herb.match ?? 100, displayLanguage)
  )
}
