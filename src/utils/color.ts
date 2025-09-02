// Small color helpers for consistent alpha variants using theme tokens
// Usage: rgbaHex(Colors.text.primary, 0.4)

export const rgbaHex = (hex: string, alpha: number): string => {
  // Normalize shorthand #RGB to #RRGGBB
  const normalized = hex.replace(/^#([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => `#${r}${r}${g}${g}${b}${b}`);
  const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized);
  if (!res) return hex;
  const r = parseInt(res[1], 16);
  const g = parseInt(res[2], 16);
  const b = parseInt(res[3], 16);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

export const withOpacity = rgbaHex;
