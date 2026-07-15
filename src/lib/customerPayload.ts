/**
 * Optional customer field serialization.
 * - create: empty → omit (undefined)
 * - update: empty → clear in DB (null)
 */
export type CustomerPayloadMode = 'create' | 'update';

export function optionalText(
  value: string,
  mode: CustomerPayloadMode
): string | null | undefined {
  const trimmed = value.trim();
  if (trimmed) return trimmed;
  return mode === 'update' ? null : undefined;
}

export function optionalDigits(
  value: string,
  mode: CustomerPayloadMode
): string | null | undefined {
  const digits = value.replace(/\D/g, '');
  if (digits) return digits;
  return mode === 'update' ? null : undefined;
}

export function optionalId(
  value: string,
  mode: CustomerPayloadMode
): string | null | undefined {
  const trimmed = value.trim();
  if (trimmed) return trimmed;
  return mode === 'update' ? null : undefined;
}
