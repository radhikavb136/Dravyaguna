/**
 * Centralized Contextual Information Tooltip Content
 * Provides accurate, professional, concise Ayurvedic and technical explanations
 * across all Dravyaguna views.
 */

export const TOOLTIP_CONTENT = {
  // =========================================
  // A. DASHBOARD & SYSTEM STATS
  // =========================================
  totalHerbs: {
    title: "Total Herbs",
    text: "Total number of herb records available in the system.",
  },
  reviewedHerbs: {
    title: "Reviewed Herbs",
    text: "Herbs that have completed the review process and are verified by domain experts.",
  },
  draftHerbs: {
    title: "Draft Herbs",
    text: "Herbs that are still being prepared or awaiting peer review.",
  },
  pendingVerifications: {
    title: "Pending Verifications",
    text: "Herb submissions or edits awaiting review by an authorized administrator or domain expert.",
  },
  recentActivity: {
    title: "Recent Activity",
    text: "Displays recently performed clinical and administrative activities in the system.",
  },
  searchAnalytics: {
    title: "Search Analytics",
    text: "Provides insights into user searches, trending clinical queries, and search activity.",
  },

  // =========================================
  // B. HERB LIBRARY & HERB PROPERTIES
  // =========================================
  herbName: {
    title: "Herb Name",
    text: "Common or recognised name of the medicinal plant.",
  },
  botanicalName: {
    title: "Botanical Name",
    text: "Scientific Latin binomial name used to globally identify the plant.",
  },
  sanskritName: {
    title: "Sanskrit Name",
    text: "Traditional Sanskrit name of the herb as documented in classical Ayurvedic texts.",
  },
  hindiName: {
    title: "Hindi Name",
    text: "Recognized Hindi name of the herb across traditional Indian practice.",
  },
  marathiName: {
    title: "Marathi Name",
    text: "Recognized Marathi name of the medicinal plant.",
  },
  regionalNames: {
    title: "Regional Names",
    text: "Vernacular and regional language names across Indian states.",
  },
  family: {
    title: "Botanical Family",
    text: "Botanical family to which the plant belongs.",
  },
  description: {
    title: "Description",
    text: "Overview of the herb, its natural habitat, and documented traditional uses.",
  },
  partUsed: {
    title: "Part Used",
    text: "Specific plant parts used for therapeutic preparations (e.g. root, bark, fruit, leaves).",
  },
  properties: {
    title: "Properties (Guna)",
    text: "Traditional Ayurvedic qualities and pharmacological characteristics of the herb.",
  },
  rasa: {
    title: "Rasa (Taste)",
    text: "Taste classification described in Ayurveda (Madhura, Amla, Lavana, Tikta, Katu, Kashaya) that initiates physiological effects.",
  },
  guna: {
    title: "Guna (Qualities)",
    text: "Qualities or attributes of the herb in Ayurvedic terminology (e.g. Guru, Laghu, Snigdha, Ruksha).",
  },
  virya: {
    title: "Virya (Potency)",
    text: "Traditional classification of the herb's metabolic energy as heating (Ushna) or cooling (Sheeta).",
  },
  vipaka: {
    title: "Vipaka (Post-Digestive Effect)",
    text: "Post-digestive metabolic transformation effect described in Ayurveda (Madhura, Amla, or Katu).",
  },
  prabhava: {
    title: "Prabhava (Special Action)",
    text: "Specific or distinctive effect attributed to a herb in Ayurvedic texts that transcends standard pharmacology.",
  },
  karma: {
    title: "Karma (Action)",
    text: "Traditional actions or therapeutic functions attributed to the herb (e.g. Deepana, Pachana, Rasayana).",
  },
  indications: {
    title: "Indications (Rogaghnata)",
    text: "Clinical conditions or diseases associated with the herb in available classical references.",
  },
  contraindications: {
    title: "Contraindications",
    text: "Situations, conditions, or patient states in which the herb may be unsuitable or require caution.",
  },
  dosage: {
    title: "Dosage (Matra)",
    text: "Reference-based dosage information. Actual dosage should depend on the preparation, form, and clinician guidance.",
  },
  references: {
    title: "References",
    text: "Classical Ayurvedic texts, Samhitas, and modern botanical sources supporting the herb information.",
  },
  dosha: {
    title: "Dosha Karma",
    text: "Influence of the herb on the three biological humors: Vata, Pitta, and Kapha.",
  },
  dhatu: {
    title: "Dhatu Influence",
    text: "Specific structural tissue systems (e.g. Rasa, Rakta, Mamsa) nourished or cleansed by the herb.",
  },
  mala: {
    title: "Mala Elimination",
    text: "Traditional actions influencing physiological waste elimination (Purisha, Mutra, Sweda).",
  },
  srotas: {
    title: "Srotas Channels",
    text: "Micro and macro bodily circulation channels governed or cleared by the herb.",
  },
  avayava: {
    title: "Avayava (Target Organs)",
    text: "Specific target organs, anatomical sites, or bodily systems predominantly affected by the herb.",
  },

  // =========================================
  // C. SEARCH & DISCOVERY
  // =========================================
  searchBar: {
    title: "Search Bar",
    text: "Search herbs using common names, botanical names, Sanskrit titles, or clinical symptoms.",
  },
  simpleSearch: {
    title: "Simple Search",
    text: "Describe patient symptoms or enter herb names in natural language to find matching remedies.",
  },
  advancedSearch: {
    title: "Advanced Search",
    text: "Use multi-parametric Ayurvedic criteria (Dosha, Rasa, Karma, Srotas) to narrow down herb search results.",
  },
  searchFilters: {
    title: "Filters",
    text: "Refine results using available criteria such as Dosha balancing, taste, and therapeutic actions.",
  },
  searchResults: {
    title: "Search Results",
    text: "Displays herbs matching the entered search criteria and clinical parameters.",
  },
  searchRelevance: {
    title: "Search Relevance",
    text: "Indicates how closely a result matches the query, supported by algorithmic and learned relevance scoring.",
  },
  clearFilters: {
    title: "Clear Filters",
    text: "Removes all currently selected filter parameters.",
  },
  doshaFilter: {
    title: "Dosha Filter",
    text: "Filter herbs by their pacifying or balancing effect on Vata, Pitta, or Kapha.",
  },
  rasaFilter: {
    title: "Rasa Filter",
    text: "Filter herbs according to primary Ayurvedic taste profiles.",
  },
  karmaFilter: {
    title: "Karma Filter",
    text: "Filter herbs based on specific therapeutic actions.",
  },
  srotasFilter: {
    title: "Srotas Filter",
    text: "Filter herbs by the physiological channel systems they support.",
  },
  statusFilter: {
    title: "Verification Status",
    text: "Filter herbs by their peer-review or verification state (Verified, Reviewed, or Draft).",
  },

  // =========================================
  // D. AUTHENTICATION & USER PROFILE
  // =========================================
  profileImage: {
    title: "Profile Image",
    text: "Upload or update your profile picture (JPG or PNG up to 2MB).",
  },
  emailAddress: {
    title: "Email Address",
    text: "Email address associated with your account, used for signing in and notifications.",
  },
  changePassword: {
    title: "Change Password",
    text: "Update your account password securely (minimum 8 characters).",
  },
  changeEmail: {
    title: "Change Email",
    text: "Update your registered email address. This will become your new sign-in identifier.",
  },
  accountRole: {
    title: "Account Role",
    text: "Indicates your permissions and access level in the application (Clinician, Domain Expert, or Admin).",
  },
  fullName: {
    title: "Full Name",
    text: "Your official name used in verification credits, reports, and administrative logs.",
  },
  displayName: {
    title: "Display Name",
    text: "Display name shown in top navigation bars and workspace greetings.",
  },
  accountStatus: {
    title: "Account Status",
    text: "Current status of your account credentials (Active, Pending, or Restricted).",
  },

  // =========================================
  // E. ADMIN PANEL
  // =========================================
  addHerb: {
    title: "Add Herb",
    text: "Create a new herb record with complete botanical and Ayurvedic properties in the library.",
  },
  editHerb: {
    title: "Edit Herb",
    text: "Update the information and clinical properties associated with an existing herb.",
  },
  deleteHerb: {
    title: "Delete Herb",
    text: "Remove a herb record, subject to application permissions and safety confirmations.",
  },
  reviewHerb: {
    title: "Review Herb",
    text: "Inspect submitted herb information and citations before approving it for clinical use.",
  },
  approve: {
    title: "Approve",
    text: "Mark a reviewed herb record as approved and verified in the clinical knowledgebase.",
  },
  draft: {
    title: "Draft Status",
    text: "Save a record without publishing it to the active clinician catalog.",
  },
  auditLog: {
    title: "Audit Log",
    text: "View recorded administrative and system activities with immutable timestamps.",
  },
  userManagement: {
    title: "User Management",
    text: "Manage application users, assign operational roles, and review accounts.",
  },
  permissions: {
    title: "Permissions",
    text: "Define which clinical and administrative actions a user role can perform.",
  },
  roleMatrix: {
    title: "Role Permissions Matrix",
    text: "Defines the clinical, review, and system-level administrative permissions granted to each user role.",
  },
  createUser: {
    title: "Create User",
    text: "Provision a new user account with specified operational roles and credentials.",
  },
  selfLearningModel: {
    title: "Self-Learning AI Model",
    text: "Adaptive search engine that continuously reinforces query-to-herb relevance from clinician interactions.",
  },
  modelSensitivity: {
    title: "Model Sensitivity",
    text: "Controls how strongly clinician clicks, views, and favorites influence search ranking order.",
  },
  vocabularyManagement: {
    title: "Vocabulary Management",
    text: "Approve or review traditional Sanskrit synonyms, regional aliases, and clinical keyword mappings.",
  },
  scoringConfiguration: {
    title: "Scoring Configuration",
    text: "Adjust algorithmic relevance weights for Dosha, Rasa, Karma, and Clinical Indications.",
  },

  // =========================================
  // F. OTHER SECTIONS & ACTIONS
  // =========================================
  savedFavorites: {
    title: "Favorites",
    text: "Quickly access medicinal herbs you have bookmarked for rapid clinical consultation.",
  },
  compareHerbs: {
    title: "Compare Herbs",
    text: "Side-by-side comparative analysis of up to 4 Ayurvedic herbs across all properties.",
  },
  savedSearches: {
    title: "Saved Searches",
    text: "Saved search queries and multi-parameter filters for rapid repeated clinical lookups.",
  },
  searchInsights: {
    title: "Search Insights",
    text: "Aggregated, anonymized search trends highlighting frequently investigated indications.",
  },
  languageSelector: {
    title: "Language Selector",
    text: "Switch display language between English, Hindi, Marathi, and classical Sanskrit.",
  },
  exportData: {
    title: "Export Dataset",
    text: "Download filtered herb records to a spreadsheet or CSV file for offline reference.",
  },
  referenceLibrary: {
    title: "Reference Library",
    text: "Browse verified classical Ayurvedic texts, botanical monographs, and clinical compendiums.",
  },
};

/**
 * Helper to retrieve tooltip information by key or fallback
 */
export function getTooltipInfo(key) {
  if (!key) return null;
  return TOOLTIP_CONTENT[key] || null;
}
