/** API pack money fields — prefer numeric hallRateValue over legacy hallRate string. */

export interface ApiPackHallRateSource {
  hallRateValue?: number | null;
  hallRate?: unknown;
}

export function readPackHallRate(pack: ApiPackHallRateSource): string {
  const fromValue = pack.hallRateValue;
  if (fromValue != null && Number.isFinite(Number(fromValue))) {
    return String(fromValue);
  }
  if (pack.hallRate != null && pack.hallRate !== '') {
    return String(pack.hallRate);
  }
  return '';
}

export function packHasHallCharge(pack: ApiPackHallRateSource): boolean {
  return Boolean(readPackHallRate(pack));
}
