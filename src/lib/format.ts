// Indian rupee + dd/mm/yyyy formatters

export function formatINR(n: number): string {
  if (n === 0) return "₹ 0";
  const neg = n < 0;
  const abs = Math.abs(Math.round(n));
  // Indian grouping: last 3, then groups of 2
  const s = abs.toString();
  let out: string;
  if (s.length <= 3) out = s;
  else {
    const last3 = s.slice(-3);
    const rest = s.slice(0, -3);
    out = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
  }
  return `${neg ? "-" : ""}₹ ${out}`;
}

export function formatINRShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_00_00_000) return `₹ ${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (abs >= 1_00_000) return `₹ ${(n / 1_00_000).toFixed(2)} L`;
  if (abs >= 1_000) return `₹ ${(n / 1_000).toFixed(1)}k`;
  return formatINR(n);
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}

export function formatDateShort(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

export function formatTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function formatDateTime(d: Date | string): string {
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

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
