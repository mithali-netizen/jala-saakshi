import { buildLocations, computeFacts, getReadings, monthsWithData } from "./readings";

/** Computed once from the shipping dataset; every count on screen comes from here. */
export const readings = getReadings();
export const locations = buildLocations(readings);
export const facts = computeFacts(readings, locations);
export const dataMonths = monthsWithData(locations);
