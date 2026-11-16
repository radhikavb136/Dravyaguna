export function buildHelpTopics(t) {
  return {
    search: {
      icon: "🔎",
      title: t("helpTopicSearchTitle"),
      description: t("helpTopicSearchDesc"),
      sections: [
        { title: t("helpTopicSearchSec1Title"), text: t("helpTopicSearchSec1Text") },
        { title: t("helpTopicSearchSec2Title"), text: t("helpTopicSearchSec2Text") },
        { title: t("helpTopicSearchSec3Title"), text: t("helpTopicSearchSec3Text") },
      ],
    },
    herbs: {
      icon: "🌿",
      title: t("helpTopicHerbsTitle"),
      description: t("helpTopicHerbsDesc"),
      sections: [
        { title: t("helpTopicHerbsSec1Title"), text: t("helpTopicHerbsSec1Text") },
        { title: t("helpTopicHerbsSec2Title"), text: t("helpTopicHerbsSec2Text") },
        { title: t("helpTopicHerbsSec3Title"), text: t("helpTopicHerbsSec3Text") },
      ],
    },
    favorites: {
      icon: "★",
      title: t("helpTopicFavoritesTitle"),
      description: t("helpTopicFavoritesDesc"),
      sections: [
        { title: t("helpTopicFavoritesSec1Title"), text: t("helpTopicFavoritesSec1Text") },
        { title: t("helpTopicFavoritesSec2Title"), text: t("helpTopicFavoritesSec2Text") },
      ],
    },
    account: {
      icon: "◉",
      title: t("helpTopicAccountTitle"),
      description: t("helpTopicAccountDesc"),
      sections: [
        { title: t("helpTopicAccountSec1Title"), text: t("helpTopicAccountSec1Text") },
        { title: t("helpTopicAccountSec2Title"), text: t("helpTopicAccountSec2Text") },
      ],
    },
    results: {
      icon: "📊",
      title: t("helpResTitle"),
      description: t("helpResDesc"),
      sections: [
        { title: t("helpResSec1Title"), text: t("helpResSec1Text") },
        { title: t("helpResSec2Title"), text: t("helpResSec2Text") },
        { title: t("helpResSec3Title"), text: t("helpResSec3Text") },
      ],
    },
    billing: {
      icon: "💳",
      title: t("helpBillTitle"),
      description: t("helpBillDesc"),
      sections: [
        { title: t("helpBillSec1Title"), text: t("helpBillSec1Text") },
        { title: t("helpBillSec2Title"), text: t("helpBillSec2Text") },
      ],
    },
  }
}

export function buildAdminHelpTopics(t) {
  return [
    {
      id: "admin-dashboard",
      icon: "▦",
      title: t("adminHelpTopicDashboardTitle"),
      description: t("adminHelpTopicDashboardDesc"),
      content: [
        {
          heading: t("adminHelpDashboardHeading1"),
          text: t("adminHelpDashboardText1"),
        },
        {
          heading: t("adminHelpDashboardHeading2"),
          text: t("adminHelpDashboardText2"),
        },
      ],
    },
    {
      id: "admin-herbs",
      icon: "🌿",
      title: t("adminHelpTopicHerbsTitle"),
      description: t("adminHelpTopicHerbsDesc"),
      content: [
        {
          heading: t("adminHelpHerbsHeading1"),
          text: t("adminHelpHerbsText1"),
          steps: [
            t("adminHelpHerbsStep1"),
            t("adminHelpHerbsStep2"),
            t("adminHelpHerbsStep3"),
            t("adminHelpHerbsStep4"),
          ],
        },
        {
          heading: t("adminHelpHerbsHeading2"),
          text: t("adminHelpHerbsText2"),
        },
      ],
    },
    {
      id: "admin-vocabulary",
      icon: "▣",
      title: t("adminHelpTopicVocabularyTitle"),
      description: t("adminHelpTopicVocabularyDesc"),
      content: [
        {
          heading: t("adminHelpVocabularyHeading1"),
          text: t("adminHelpVocabularyText1"),
        },
        {
          heading: t("adminHelpVocabularyHeading2"),
          text: t("adminHelpVocabularyText2"),
        },
      ],
    },
    {
      id: "admin-users",
      icon: "♙",
      title: t("adminHelpTopicUsersTitle"),
      description: t("adminHelpTopicUsersDesc"),
      content: [
        {
          heading: t("adminHelpUsersHeading1"),
          text: t("adminHelpUsersText1"),
        },
        {
          heading: t("adminHelpUsersHeading2"),
          text: t("adminHelpUsersText2"),
        },
      ],
    },
    {
      id: "admin-analytics",
      icon: "⌁",
      title: t("adminHelpTopicAnalyticsTitle"),
      description: t("adminHelpTopicAnalyticsDesc"),
      content: [
        {
          heading: t("adminHelpAnalyticsHeading1"),
          text: t("adminHelpAnalyticsText1"),
        },
      ],
    },
    {
      id: "admin-audit",
      icon: "▤",
      title: t("adminHelpTopicAuditTitle"),
      description: t("adminHelpTopicAuditDesc"),
      content: [
        {
          heading: t("adminHelpAuditHeading1"),
          text: t("adminHelpAuditText1"),
        },
      ],
    },
  ]
}

export function buildHelpFaqs(t) {
  return [
    { question: t("helpFaq1Q"), answer: t("helpFaq1A") },
    { question: t("helpFaq2Q"), answer: t("helpFaq2A") },
    { question: t("helpFaq3Q"), answer: t("helpFaq3A") },
    { question: t("helpFaq4Q"), answer: t("helpFaq4A") },
    { question: t("helpFaq5Q"), answer: t("helpFaq5A") },
    { question: t("helpFaq6Q"), answer: t("helpFaq6A") },
    { question: t("helpFaq7Q"), answer: t("helpFaq7A") },
  ]
}

export function buildAdminHelpFaqs(t) {
  return [
    { question: t("adminHelpFaq1Q"), answer: t("adminHelpFaq1A") },
    { question: t("adminHelpFaq2Q"), answer: t("adminHelpFaq2A") },
    { question: t("adminHelpFaq3Q"), answer: t("adminHelpFaq3A") },
    { question: t("adminHelpFaq4Q"), answer: t("adminHelpFaq4A") },
    { question: t("adminHelpFaq5Q"), answer: t("adminHelpFaq5A") },
  ]
}
