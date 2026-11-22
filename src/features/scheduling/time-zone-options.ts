import type { SelectOption } from "@/components/ui/app-select";

const preferred = ["Pacific/Honolulu", "Europe/London", "America/New_York", "UTC"];

/** Canonical IANA identifiers supplied by the runtime's maintained ICU time-zone database. */
export function supportedTimeZoneOptions(): SelectOption[] {
  const all = typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone") : preferred;
  const unique = [...new Set([...preferred, ...all])];
  return unique.filter(zone => {
    try { new Intl.DateTimeFormat("en-GB", { timeZone: zone }); return true; }
    catch { return false; }
  }).map(value => ({ value, label: value.replaceAll("_", " ") }));
}
