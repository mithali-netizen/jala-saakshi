/**
 * Jala Saakshi's own lake watchlist — SEEDED DEMO DATA.
 *
 * This is deliberately a different thing from the KSPCB coverage figure, which is
 * `Stats.lakesInReports` and is 0. One is "lakes the board publishes monthly readings
 * for"; this is "lakes this prototype would watch". Any screen showing this number must
 * use WATCHED_LAKES_LABEL (or its own wording naming Jala Saakshi) and a Demo tag, so the
 * two can never read as a contradiction.
 */
export const DEMO_WATCHED_LAKES = 12;

export const WATCHED_LAKES_LABEL = `lakes watched by Jala Saakshi`;

/** Risk split across the watchlist. Seeded; must stay consistent with DEMO_WATCHED_LAKES. */
export const DEMO_WATCHLIST_RISK = { high: 3, elevated: 5, low: 4 };
