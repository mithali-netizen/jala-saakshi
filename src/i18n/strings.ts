/**
 * UI strings for the citizen app, in English and Kannada.
 *
 * A plain dictionary, deliberately: this is a handful of screens, and a translation
 * library would be more machinery than the problem needs.
 *
 * The Kannada here was written without a native speaker reviewing it. It should be
 * checked by one before this is put in front of Kannada-speaking users; the risk is not
 * that a word is missing but that it reads as stilted or wrong.
 *
 * The dashboard, the case pages and the authority portal stay in English for now.
 */

export type Lang = 'en' | 'kn';

/** Speech recognition locale for each UI language. */
export const SPEECH_LOCALE: Record<Lang, string> = { en: 'en-IN', kn: 'kn-IN' };

export const LANGS: { code: Lang; label: string; short: string }[] = [
  { code: 'kn', label: 'ಕನ್ನಡ', short: 'ಕ' },
  { code: 'en', label: 'English', short: 'A' },
];

const en = {
  appTagline: 'Karnataka water quality',
  greetingMorning: 'Good morning',
  greetingAfternoon: 'Good afternoon',
  greetingEvening: 'Good evening',
  homeTitle: 'How are our lakes today?',

  navHome: 'Home',
  navMap: 'Map',
  navReport: 'Report',
  navAlerts: 'Alerts',
  navMyReports: 'My reports',

  lakeHealth: 'Bengaluru lake health',
  watchedLakes: 'lakes watched by Jala Saakshi',
  high: 'High',
  elevated: 'Elevated',
  low: 'Low',
  coverageNote: "No lake appears in KSPCB's monthly river reports. This watchlist is our own.",
  lakeNeedingAttention: 'Lake needing attention',
  viewMap: 'View map',
  nearbyAlerts: 'Nearby alerts',
  exampleAlert: 'Example alert',
  seededExample: 'Seeded example',
  seededNotReal: 'Seeded example · not a real observation',
  flaggedExample: 'Example of how a flagged lake would appear',
  reportPollution: 'Report pollution',

  selectedLake: 'Selected lake',
  bengaluruLakes: 'Bengaluru lakes',
  mapped: 'mapped',
  loading: 'Loading…',
  noReading: 'No reading',
  noReadingLong: "No dissolved oxygen, BOD or coliform figure for this lake in KSPCB's monthly river reports.",
  tapALake: 'Tap a lake to see what is known about it.',
  yourReportsPinned: 'Your reports are pinned here too.',
  reportsWillAppear: 'Reports you make appear here as pins.',
  reportHere: 'Report a problem here',
  lakeShapesCredit: 'Lake shapes © OpenStreetMap contributors',

  reportTitle: 'Report a problem',
  whatDidYouNotice: 'What did you notice?',
  reportIntro: 'Your report is saved in this browser and used to draft a complaint you send yourself.',
  addPhoto: 'Add a photo',
  readingPhoto: 'Reading photo…',
  photoHint: 'Camera on a phone, file picker on a computer',
  removePhoto: 'Remove photo',
  lake: 'Lake',
  searchLakes: 'Search Bengaluru lakes',
  noLakeMatches: 'No lake matches',
  location: 'Location',
  approximate: 'Approximate',
  edited: 'Edited',
  findingLocation: 'Finding your location…',
  latitude: 'Latitude',
  longitude: 'Longitude',
  locFromLake: 'Taken from the lake you picked, not from your device.',
  locFromDevice: 'From your device. Correct it if it is wrong.',
  whatDidYouSee: 'What did you see?',
  chooseAll: 'Choose all that apply',
  dateObserved: 'Date observed',
  description: 'Description',
  optional: 'Optional',
  descPlaceholder: 'Add a short note about what you saw',
  startVoice: 'Start voice input',
  stopVoice: 'Stop voice input',
  listening: 'Listening',
  voiceHint: 'Voice input — browser speech recognition. It gets words wrong; read the text before you submit.',
  reviewReport: 'Review report',
  chooseLakeFirst: 'Choose a lake and what you saw',
  prototypeNote: 'Reports are saved in this browser only. Nothing is sent to any authority until you send it yourself.',
  prototype: 'Prototype.',

  reviewTitle: 'Review report',
  checkBeforeSubmit: 'Check before you submit',
  reviewIntro: 'This is what will be saved and used to draft your complaint.',
  noPhotoAttached: 'No photo attached',
  yourPhoto: 'YOUR PHOTO',
  whatYouSaw: 'What you saw',
  note: 'Note',
  addressedTo: 'Will be addressed to',
  notChosen: 'Not chosen',
  noAutoClassification: 'No automatic classification',
  noAutoClassificationBody:
    'Reading the photo automatically is not connected in this prototype. What you selected is what gets recorded.',
  saveReport: 'Save report',

  myReports: 'My reports',
  all: 'All',
  noReportsYet: 'No reports yet',
  noReportsBody: 'Reports you make are saved in this browser and listed here.',
  reportAnother: 'Report another problem',
  photoAttached: '1 photo attached',
  storedInBrowser: 'Stored in this browser',
  openComplaint: 'Open complaint in your email app',
  complaintNote: 'You review and send it; nothing is sent for you.',
  ackNoteTitle: 'Acknowledged would not mean resolved.',
  ackNoteBody: 'No status here is set by an authority — this prototype has no connection to one.',
  daysAgo: 'days ago',
  dayAgo: 'day ago',
};

/** Same keys, Kannada. Missing or empty values fall back to English at lookup. */
const kn: Partial<Record<keyof typeof en, string>> = {
  appTagline: 'ಕರ್ನಾಟಕದ ನೀರಿನ ಗುಣಮಟ್ಟ',
  greetingMorning: 'ಶುಭೋದಯ',
  greetingAfternoon: 'ಶುಭ ಮಧ್ಯಾಹ್ನ',
  greetingEvening: 'ಶುಭ ಸಂಜೆ',
  homeTitle: 'ನಮ್ಮ ಕೆರೆಗಳು ಇಂದು ಹೇಗಿವೆ?',

  navHome: 'ಮುಖಪುಟ',
  navMap: 'ನಕ್ಷೆ',
  navReport: 'ವರದಿ',
  navAlerts: 'ಎಚ್ಚರಿಕೆ',
  navMyReports: 'ನನ್ನ ವರದಿ',

  lakeHealth: 'ಬೆಂಗಳೂರು ಕೆರೆಗಳ ಸ್ಥಿತಿ',
  watchedLakes: 'ಜಲ ಸಾಕ್ಷಿ ಗಮನಿಸುತ್ತಿರುವ ಕೆರೆಗಳು',
  high: 'ಹೆಚ್ಚು',
  elevated: 'ಮಧ್ಯಮ',
  low: 'ಕಡಿಮೆ',
  coverageNote: 'KSPCB ಮಾಸಿಕ ನದಿ ವರದಿಗಳಲ್ಲಿ ಯಾವ ಕೆರೆಯೂ ಇಲ್ಲ. ಈ ಪಟ್ಟಿ ನಮ್ಮದೇ.',
  lakeNeedingAttention: 'ಗಮನ ಬೇಕಿರುವ ಕೆರೆ',
  viewMap: 'ನಕ್ಷೆ ನೋಡಿ',
  nearbyAlerts: 'ಹತ್ತಿರದ ಎಚ್ಚರಿಕೆಗಳು',
  exampleAlert: 'ಮಾದರಿ ಎಚ್ಚರಿಕೆ',
  seededExample: 'ಮಾದರಿ ಉದಾಹರಣೆ',
  seededNotReal: 'ಮಾದರಿ ಉದಾಹರಣೆ · ನಿಜವಾದ ಗಮನಿಕೆ ಅಲ್ಲ',
  flaggedExample: 'ಗುರುತಿಸಿದ ಕೆರೆ ಹೀಗೆ ಕಾಣಿಸುತ್ತದೆ',
  reportPollution: 'ಮಾಲಿನ್ಯ ವರದಿ ಮಾಡಿ',

  selectedLake: 'ಆಯ್ಕೆ ಮಾಡಿದ ಕೆರೆ',
  bengaluruLakes: 'ಬೆಂಗಳೂರಿನ ಕೆರೆಗಳು',
  mapped: 'ನಕ್ಷೆಯಲ್ಲಿವೆ',
  loading: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ…',
  noReading: 'ಅಳತೆ ಇಲ್ಲ',
  noReadingLong: 'KSPCB ಮಾಸಿಕ ನದಿ ವರದಿಗಳಲ್ಲಿ ಈ ಕೆರೆಯ ಆಮ್ಲಜನಕ, BOD ಅಥವಾ ಕೋಲಿಫಾರ್ಮ್ ಅಳತೆ ಇಲ್ಲ.',
  tapALake: 'ಕೆರೆಯನ್ನು ಒತ್ತಿ ಅದರ ಮಾಹಿತಿ ನೋಡಿ.',
  yourReportsPinned: 'ನಿಮ್ಮ ವರದಿಗಳೂ ಇಲ್ಲಿ ಗುರುತಾಗಿವೆ.',
  reportsWillAppear: 'ನೀವು ಮಾಡುವ ವರದಿಗಳು ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತವೆ.',
  reportHere: 'ಇಲ್ಲಿ ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ',
  lakeShapesCredit: 'ಕೆರೆಯ ಆಕೃತಿಗಳು © OpenStreetMap',

  reportTitle: 'ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ',
  whatDidYouNotice: 'ನೀವು ಏನು ಗಮನಿಸಿದಿರಿ?',
  reportIntro: 'ನಿಮ್ಮ ವರದಿ ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಉಳಿಯುತ್ತದೆ. ಅದರಿಂದ ದೂರು ಸಿದ್ಧವಾಗುತ್ತದೆ, ಅದನ್ನು ನೀವೇ ಕಳುಹಿಸಬೇಕು.',
  addPhoto: 'ಫೋಟೋ ಸೇರಿಸಿ',
  readingPhoto: 'ಫೋಟೋ ಓದುತ್ತಿದೆ…',
  photoHint: 'ಮೊಬೈಲ್‌ನಲ್ಲಿ ಕ್ಯಾಮೆರಾ, ಕಂಪ್ಯೂಟರ್‌ನಲ್ಲಿ ಫೈಲ್ ಆಯ್ಕೆ',
  removePhoto: 'ಫೋಟೋ ತೆಗೆದುಹಾಕಿ',
  lake: 'ಕೆರೆ',
  searchLakes: 'ಬೆಂಗಳೂರಿನ ಕೆರೆಗಳನ್ನು ಹುಡುಕಿ',
  noLakeMatches: 'ಯಾವ ಕೆರೆಯೂ ಹೊಂದಿಕೆಯಾಗಲಿಲ್ಲ',
  location: 'ಸ್ಥಳ',
  approximate: 'ಅಂದಾಜು',
  edited: 'ಬದಲಾಯಿಸಲಾಗಿದೆ',
  findingLocation: 'ನಿಮ್ಮ ಸ್ಥಳ ಹುಡುಕುತ್ತಿದೆ…',
  latitude: 'ಅಕ್ಷಾಂಶ',
  longitude: 'ರೇಖಾಂಶ',
  locFromLake: 'ನೀವು ಆಯ್ಕೆ ಮಾಡಿದ ಕೆರೆಯಿಂದ ತೆಗೆದುಕೊಳ್ಳಲಾಗಿದೆ, ನಿಮ್ಮ ಸಾಧನದಿಂದ ಅಲ್ಲ.',
  locFromDevice: 'ನಿಮ್ಮ ಸಾಧನದಿಂದ. ತಪ್ಪಾಗಿದ್ದರೆ ಸರಿಪಡಿಸಿ.',
  whatDidYouSee: 'ನೀವು ಏನು ನೋಡಿದಿರಿ?',
  chooseAll: 'ಅನ್ವಯವಾಗುವ ಎಲ್ಲವನ್ನೂ ಆಯ್ಕೆಮಾಡಿ',
  dateObserved: 'ಗಮನಿಸಿದ ದಿನಾಂಕ',
  description: 'ವಿವರಣೆ',
  optional: 'ಐಚ್ಛಿಕ',
  descPlaceholder: 'ನೀವು ನೋಡಿದ್ದನ್ನು ಸಂಕ್ಷಿಪ್ತವಾಗಿ ಬರೆಯಿರಿ',
  startVoice: 'ಧ್ವನಿ ಮೂಲಕ ಹೇಳಿ',
  stopVoice: 'ನಿಲ್ಲಿಸಿ',
  listening: 'ಕೇಳುತ್ತಿದೆ',
  voiceHint: 'ಧ್ವನಿ ಇನ್‌ಪುಟ್ — ಬ್ರೌಸರ್ ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ. ಪದಗಳು ತಪ್ಪಾಗಬಹುದು; ಕಳುಹಿಸುವ ಮೊದಲು ಓದಿ ಸರಿಪಡಿಸಿ.',
  reviewReport: 'ವರದಿ ಪರಿಶೀಲಿಸಿ',
  chooseLakeFirst: 'ಕೆರೆ ಮತ್ತು ನೀವು ನೋಡಿದ್ದನ್ನು ಆಯ್ಕೆಮಾಡಿ',
  prototypeNote: 'ವರದಿಗಳು ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಮಾತ್ರ ಉಳಿಯುತ್ತವೆ. ನೀವೇ ಕಳುಹಿಸುವವರೆಗೆ ಯಾವ ಇಲಾಖೆಗೂ ಹೋಗುವುದಿಲ್ಲ.',
  prototype: 'ಮಾದರಿ.',

  reviewTitle: 'ವರದಿ ಪರಿಶೀಲಿಸಿ',
  checkBeforeSubmit: 'ಕಳುಹಿಸುವ ಮೊದಲು ಪರಿಶೀಲಿಸಿ',
  reviewIntro: 'ಇದನ್ನೇ ಉಳಿಸಲಾಗುತ್ತದೆ ಮತ್ತು ದೂರು ಸಿದ್ಧಪಡಿಸಲು ಬಳಸಲಾಗುತ್ತದೆ.',
  noPhotoAttached: 'ಫೋಟೋ ಸೇರಿಸಿಲ್ಲ',
  yourPhoto: 'ನಿಮ್ಮ ಫೋಟೋ',
  whatYouSaw: 'ನೀವು ನೋಡಿದ್ದು',
  note: 'ಟಿಪ್ಪಣಿ',
  addressedTo: 'ಯಾರಿಗೆ ಕಳುಹಿಸಲಾಗುತ್ತದೆ',
  notChosen: 'ಆಯ್ಕೆ ಮಾಡಿಲ್ಲ',
  noAutoClassification: 'ಸ್ವಯಂಚಾಲಿತ ವರ್ಗೀಕರಣ ಇಲ್ಲ',
  noAutoClassificationBody:
    'ಈ ಮಾದರಿಯಲ್ಲಿ ಫೋಟೋವನ್ನು ತಾನಾಗಿ ಓದುವ ವ್ಯವಸ್ಥೆ ಜೋಡಿಸಿಲ್ಲ. ನೀವು ಆಯ್ಕೆ ಮಾಡಿದ್ದೇ ದಾಖಲಾಗುತ್ತದೆ.',
  saveReport: 'ವರದಿ ಉಳಿಸಿ',

  myReports: 'ನನ್ನ ವರದಿಗಳು',
  all: 'ಎಲ್ಲಾ',
  noReportsYet: 'ಇನ್ನೂ ವರದಿಗಳಿಲ್ಲ',
  noReportsBody: 'ನೀವು ಮಾಡುವ ವರದಿಗಳು ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಉಳಿದು ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತವೆ.',
  reportAnother: 'ಇನ್ನೊಂದು ವರದಿ ಮಾಡಿ',
  photoAttached: '1 ಫೋಟೋ ಸೇರಿಸಲಾಗಿದೆ',
  storedInBrowser: 'ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಉಳಿಸಲಾಗಿದೆ',
  openComplaint: 'ಇಮೇಲ್ ಆ್ಯಪ್‌ನಲ್ಲಿ ದೂರು ತೆರೆಯಿರಿ',
  complaintNote: 'ನೀವೇ ಪರಿಶೀಲಿಸಿ ಕಳುಹಿಸಬೇಕು; ನಮ್ಮಿಂದ ಏನೂ ಕಳುಹಿಸುವುದಿಲ್ಲ.',
  ackNoteTitle: 'ಸ್ವೀಕೃತಿ ಎಂದರೆ ಪರಿಹಾರ ಅಲ್ಲ.',
  ackNoteBody: 'ಇಲ್ಲಿನ ಯಾವ ಸ್ಥಿತಿಯನ್ನೂ ಇಲಾಖೆ ನಿಗದಿಪಡಿಸಿಲ್ಲ — ಈ ಮಾದರಿಗೆ ಅವರ ಸಂಪರ್ಕ ಇಲ್ಲ.',
  daysAgo: 'ದಿನಗಳ ಹಿಂದೆ',
  dayAgo: 'ದಿನದ ಹಿಂದೆ',
};

export type StringKey = keyof typeof en;

export const STRINGS: Record<Lang, Partial<Record<StringKey, string>>> = { en, kn };

/** Falls back to English for anything not translated, so nothing renders blank. */
export function translate(lang: Lang, key: StringKey): string {
  return STRINGS[lang][key] || en[key];
}

/** Issue chips, kept beside the rest of the copy. */
export const ISSUE_LABELS: Record<Lang, Record<string, string>> = {
  en: {},
  kn: {
    'Dead fish': 'ಸತ್ತ ಮೀನು',
    Froth: 'ನೊರೆ',
    'Sewage inflow': 'ಚರಂಡಿ ನೀರು',
    Algae: 'ಪಾಚಿ',
    'Foul smell': 'ದುರ್ವಾಸನೆ',
    'Floating waste': 'ತೇಲುವ ತ್ಯಾಜ್ಯ',
    'Illegal dumping': 'ಅಕ್ರಮ ತ್ಯಾಜ್ಯ ಸುರಿಯುವಿಕೆ',
    Other: 'ಇತರೆ',
  },
};
