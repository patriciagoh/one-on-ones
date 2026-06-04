/** North America timezones (IANA value + friendly label) for the report form. */
export const NA_TIMEZONES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "America/St_Johns", label: "Newfoundland — St. John's (NST)" },
  { value: "America/Halifax", label: "Atlantic — Halifax (AST)" },
  { value: "America/Toronto", label: "Eastern — Toronto (ET)" },
  { value: "America/New_York", label: "Eastern — New York (ET)" },
  { value: "America/Winnipeg", label: "Central — Winnipeg (CT)" },
  { value: "America/Chicago", label: "Central — Chicago (CT)" },
  { value: "America/Edmonton", label: "Mountain — Edmonton (MT)" },
  { value: "America/Denver", label: "Mountain — Denver (MT)" },
  { value: "America/Phoenix", label: "Mountain — Phoenix (no DST)" },
  { value: "America/Vancouver", label: "Pacific — Vancouver (PT)" },
  { value: "America/Los_Angeles", label: "Pacific — Los Angeles (PT)" },
  { value: "America/Anchorage", label: "Alaska — Anchorage (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii — Honolulu (HT)" },
];

/** Canadian provinces/territories (all 13). */
export const CA_PROVINCES: readonly string[] = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick",
  "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia",
  "Nunavut", "Ontario", "Prince Edward Island", "Quebec",
  "Saskatchewan", "Yukon",
];

/** US states (all 50) + District of Columbia, alphabetical. */
export const US_STATES: readonly string[] = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California",
  "Colorado", "Connecticut", "Delaware", "District of Columbia", "Florida",
  "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana",
  "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine",
  "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota",
  "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
  "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah",
  "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin",
  "Wyoming",
];

/** Maps every CA province/territory and US state to its predominant IANA timezone. */
export const LOCATION_TIMEZONE: Record<string, string> = {
  // Canada
  "Newfoundland and Labrador": "America/St_Johns",
  "New Brunswick": "America/Halifax",
  "Nova Scotia": "America/Halifax",
  "Prince Edward Island": "America/Halifax",
  "Ontario": "America/Toronto",
  "Quebec": "America/Toronto",
  "Nunavut": "America/Toronto",
  "Manitoba": "America/Winnipeg",
  "Saskatchewan": "America/Winnipeg",
  "Alberta": "America/Edmonton",
  "Northwest Territories": "America/Edmonton",
  "Yukon": "America/Edmonton",
  "British Columbia": "America/Vancouver",
  // United States
  "Connecticut": "America/New_York",
  "Delaware": "America/New_York",
  "Florida": "America/New_York",
  "Georgia": "America/New_York",
  "Indiana": "America/New_York",
  "Kentucky": "America/New_York",
  "Maine": "America/New_York",
  "Maryland": "America/New_York",
  "Massachusetts": "America/New_York",
  "Michigan": "America/New_York",
  "New Hampshire": "America/New_York",
  "New Jersey": "America/New_York",
  "New York": "America/New_York",
  "North Carolina": "America/New_York",
  "Ohio": "America/New_York",
  "Pennsylvania": "America/New_York",
  "Rhode Island": "America/New_York",
  "South Carolina": "America/New_York",
  "Vermont": "America/New_York",
  "Virginia": "America/New_York",
  "West Virginia": "America/New_York",
  "District of Columbia": "America/New_York",
  "Alabama": "America/Chicago",
  "Arkansas": "America/Chicago",
  "Illinois": "America/Chicago",
  "Iowa": "America/Chicago",
  "Kansas": "America/Chicago",
  "Louisiana": "America/Chicago",
  "Minnesota": "America/Chicago",
  "Mississippi": "America/Chicago",
  "Missouri": "America/Chicago",
  "Nebraska": "America/Chicago",
  "North Dakota": "America/Chicago",
  "Oklahoma": "America/Chicago",
  "South Dakota": "America/Chicago",
  "Tennessee": "America/Chicago",
  "Texas": "America/Chicago",
  "Wisconsin": "America/Chicago",
  "Colorado": "America/Denver",
  "Idaho": "America/Denver",
  "Montana": "America/Denver",
  "New Mexico": "America/Denver",
  "Utah": "America/Denver",
  "Wyoming": "America/Denver",
  "Arizona": "America/Phoenix",
  "California": "America/Los_Angeles",
  "Nevada": "America/Los_Angeles",
  "Oregon": "America/Los_Angeles",
  "Washington": "America/Los_Angeles",
  "Alaska": "America/Anchorage",
  "Hawaii": "Pacific/Honolulu",
};

/** Friendly label for a timezone value (from NA_TIMEZONES), or the raw value. */
export function tzLabel(value: string): string {
  return NA_TIMEZONES.find((t) => t.value === value)?.label ?? value;
}
