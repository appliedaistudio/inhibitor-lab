export const defaultSettings = {
  enabled: true,
  strictness: 'medium',
  responseMode: 'warn',
  categories: {
    edsBodyDysmorphia: true,
    profanity: true,
    hatefulLanguage: true,
    sexualContent: true,
    abuse: true,
    violenceGore: true,
    selfHarm: true,
    substanceUse: true,
    gambling: true,
  },
}

export const categoryLabels = {
  edsBodyDysmorphia: 'EDS / Body Dysmorphia',
  profanity: 'Profanity',
  hatefulLanguage: 'Hateful Language',
  sexualContent: 'Sexual Content',
  abuse: 'Abuse',
  violenceGore: 'Violence / Gore',
  selfHarm: 'Self-Harm',
  substanceUse: 'Substance Use',
  gambling: 'Gambling',
}