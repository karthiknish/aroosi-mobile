export type DialCodeEntry = { value: string; label: string; dialCode: string; flag: string };

// Centralized data list
import { COUNTRY_DIAL_CODES } from "./countryDialCodes.list";

/**
 * Returns the full DialCodeEntry by value (preferred) or label fallback
 */
export function findCountry(valueOrLabel: string): DialCodeEntry | undefined {
  return COUNTRY_DIAL_CODES.find(
    (e) => e.value === valueOrLabel || e.label === valueOrLabel
  );
}

/**
 * Returns the dial code string for a given country value/label, or null if not found
 */
export function getDialByValue(valueOrLabel: string): string | null {
  const entry = findCountry(valueOrLabel);
  return entry ? entry.dialCode : null;
}

/**
 * Provides {label,value} options for SearchableSelect
 */
export function getCountryOptions(): { label: string; value: string }[] {
  return COUNTRY_DIAL_CODES.map(({ label, value }) => ({ label, value }));
}

/**
 * Parses an input phone string into countryCode and local number (digits only)
 */
export function parsePhoneNumber(value: string): {
  countryCode: string;
  number: string;
} {
  if (!value) return { countryCode: "+44", number: "" };
  const trimmed = String(value).trim();
  if (trimmed.startsWith("+")) {
    const match = trimmed.match(/^\+(\d{1,3})(.*)$/);
    if (match) {
      const cc = `+${match[1]}`;
      const rest = match[2] ?? "";
      const digits = rest.replace(/\D/g, "");
      return { countryCode: cc, number: digits };
    }
    const parts = trimmed.split(/\s+/);
    const cc = parts[0];
    const rest = parts.slice(1).join(" ");
    return { countryCode: cc, number: rest.replace(/\D/g, "") };
  }
  return { countryCode: "+44", number: trimmed.replace(/\D/g, "") };
}

/**
 * Formats a phone number given a country code and a local digits string
 */
export function formatPhoneNumber(countryCode: string, number: string): string {
  const cc = (countryCode || "+44").trim();
  const digits = (number || "").replace(/\D/g, "");
  if (!digits) return cc;
  return `${cc}${digits}`;
}