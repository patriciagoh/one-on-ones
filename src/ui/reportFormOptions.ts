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
