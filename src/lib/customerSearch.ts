export type CustomerSearchFields = {
  name?: string | null;
  phone?: string | null;
  phoneCountryCode?: string | null;
  alterPhone?: string | null;
  alternatePhone?: string | null;
  whatsappNumber?: string | null;
  whatsapp?: string | null;
  email?: string | null;
};

export function customerSearchText(customer: CustomerSearchFields): string {
  return [
    customer.name,
    customer.phoneCountryCode,
    customer.phone,
    customer.alterPhone,
    customer.alternatePhone,
    customer.whatsappNumber,
    customer.whatsapp,
    customer.email,
  ]
    .filter((value) => value != null && String(value).trim() !== '')
    .join(' ');
}

/** Match free-text query against name, phone (incl. digits-only), and related contact fields. */
export function matchesCustomerSearch(
  customer: CustomerSearchFields,
  query: string
): boolean {
  return textMatchesSearch(customerSearchText(customer), query);
}

export function textMatchesSearch(text: string, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const lowerText = text.toLowerCase();
  const lowerQuery = trimmed.toLowerCase();
  if (lowerText.includes(lowerQuery)) return true;

  const queryDigits = trimmed.replace(/\D/g, '');
  if (queryDigits.length >= 2) {
    // Check each whitespace-separated token individually so digits from different
    // fields (e.g. name "Kumar1" and phone "23456") don't concatenate into a
    // spurious match for a query like "12".
    for (const token of text.split(/\s+/)) {
      const tokenDigits = token.replace(/\D/g, '');
      if (tokenDigits.includes(queryDigits)) return true;
    }
    // Also allow full-concatenated match for long queries (≥6 digits) so that
    // E164-style input like "919876543210" can still match "+91 9876543210".
    if (queryDigits.length >= 6) {
      const textDigits = text.replace(/\D/g, '');
      if (textDigits.includes(queryDigits)) return true;
    }
  }

  return false;
}

export function formatCustomerOptionLabel(customer: CustomerSearchFields): string {
  const name = (customer.name || '').trim();
  const code = (customer.phoneCountryCode || '+91').trim();
  const phone = (customer.phone || '').trim();
  const phoneDisplay = phone ? `${code} ${phone}`.trim() : '';
  if (!name && !phoneDisplay) return '';
  if (!phoneDisplay) return name;
  if (!name) return phoneDisplay;
  return `${name} (${phoneDisplay})`;
}
