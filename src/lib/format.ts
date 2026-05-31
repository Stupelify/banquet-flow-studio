/**
 * Display helpers — match the real client's conventions:
 *   • Amounts: en-IN grouping (lakh/crore), digit-only storage, `₹ ` prefix.
 *   • Dates:   dd/mm/yyyy (en-GB).
 *   • Times:   24h HH:mm.
 * Mirrors client/src/lib/indianAmountFormat.ts and client/src/lib/date.ts.
 */

/* ──────────────────────────────  AMOUNTS  ─────────────────────────────── */

export function stripToDigits(raw: string | number | null | undefined): string {
  if (raw == null) return "";
  return String(raw).replace(/\D/g, "");
}

/** Pure number → en-IN grouped string, no symbol. Empty input → "". */
export function formatINRPlain(value: number | string | null | undefined): string {
  if (value == null || value === "") return "";
  const n = typeof value === "number" ? value : Number(stripToDigits(value));
  if (!Number.isFinite(n)) return "";
  return Math.round(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

/** With ₹ symbol. Negative values get a leading minus before the symbol. */
export function formatINR(value: number | string | null | undefined): string {
  if (value == null || value === "") return "₹ 0";
  const n = typeof value === "number" ? value : Number(stripToDigits(value));
  if (!Number.isFinite(n)) return "₹ 0";
  const neg = n < 0;
  const abs = Math.abs(Math.round(n));
  return `${neg ? "-" : ""}₹ ${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/** Compact: 12.5 L / 1.20 Cr / 12.3k / fallback to full ₹. */
export function formatINRShort(value: number | string | null | undefined): string {
  if (value == null || value === "") return "₹ 0";
  const n = typeof value === "number" ? value : Number(stripToDigits(value));
  if (!Number.isFinite(n)) return "₹ 0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_00_00_000) return `${sign}₹ ${(abs / 1_00_00_000).toFixed(2)} Cr`;
  if (abs >= 1_00_000) return `${sign}₹ ${(abs / 1_00_000).toFixed(2)} L`;
  if (abs >= 1_000) return `${sign}₹ ${(abs / 1_000).toFixed(1)}k`;
  return formatINR(n);
}

/** Strict en-IN parse: matches the real client's `formatIndianAmountDisplay`. */
export function formatIndianAmountDisplay(digits: string | number | null | undefined): string {
  return formatINRPlain(digits);
}

/* ──────────────────────────────  DATES  ───────────────────────────────── */

function parseDateValue(input: string | Date | null | undefined): Date | null {
  if (input == null) return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  const s = typeof input === "string" ? input.trim() : "";
  if (!s) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (dateOnly) {
    const d = new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(input: string | Date | null | undefined, fallback = "—"): string {
  const d = parseDateValue(input);
  if (!d) return fallback;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function formatDateShort(input: string | Date | null | undefined): string {
  const d = parseDateValue(input);
  if (!d) return "—";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

export function formatTime(input: string | Date | null | undefined): string {
  if (typeof input === "string" && /^\d{1,2}:\d{2}$/.test(input)) return input.padStart(5, "0");
  const d = parseDateValue(input);
  if (!d) return "—";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatDateTime(input: string | Date | null | undefined): string {
  const d = parseDateValue(input);
  if (!d) return "—";
  return `${formatDate(d)} ${formatTime(d)}`;
}

export function relativeDur(toMs: number, fromMs = Date.now()): string {
  const diff = toMs - fromMs;
  const sign = diff < 0 ? "-" : "";
  const a = Math.abs(diff);
  const h = Math.floor(a / 3_600_000);
  const m = Math.floor((a % 3_600_000) / 60_000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${sign}${d}d ${h % 24}h`;
  }
  return `${sign}${h}h ${m}m`;
}

export function dayKey(d: Date | string | null | undefined): string {
  const date = parseDateValue(d);
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/* ────────────────────────────  MISC LABELS  ───────────────────────────── */

export function priorityLabel(p: number | null | undefined): "VIP" | "High" | "Normal" {
  if (p === 1) return "VIP";
  if (p === 2) return "High";
  return "Normal";
}

export function paymentMethodLabel(m: string | null | undefined): string {
  switch ((m ?? "").toLowerCase()) {
    case "cash": return "Cash";
    case "card": return "Card";
    case "upi": return "UPI";
    case "cheque": return "Cheque";
    case "bank_transfer": return "Bank Transfer";
    default: return m ?? "—";
  }
}
