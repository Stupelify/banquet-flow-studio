import { getStateFromPincode } from './indiaData';

export interface PincodeLookupResult {
  city: string;
  state: string;
}

// State is resolved instantly from the bundled local map (no network call).
// City is resolved by trying two free APIs in sequence:
//   1. api.postalpincode.in  (India Post data)
//   2. nominatim.openstreetmap.org  (global, no key required)
// If both fail the caller still gets the correct state — city is returned as ''
// and the UI lets the user type it in manually.

interface PostalPincodeResponse {
  Status?: string;
  PostOffice?: Array<{
    District?: string;
    State?: string;
    Division?: string;
    Taluk?: string;
    Block?: string;
    Name?: string;
  }>;
}

interface NominatimResponse {
  address?: {
    county?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    state_district?: string;
  };
}

async function tryCityFromPostalPincode(
  pincode: string,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as PostalPincodeResponse[];
    const result = data?.[0];
    if (result?.Status !== 'Success') return null;

    const po = result?.PostOffice?.[0];
    const city =
      po?.District?.trim() ||
      po?.Block?.trim() ||
      po?.Taluk?.trim() ||
      po?.Division?.trim() ||
      null;
    return city || null;
  } catch {
    return null;
  }
}

async function tryCityFromNominatim(
  pincode: string,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json&addressdetails=1&limit=1`;
    const response = await fetch(url, {
      signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'BikaBookingApp/1.0',
      },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as NominatimResponse[];
    const addr = data?.[0]?.address;
    if (!addr) return null;

    const city =
      addr.county?.trim() ||
      addr.city?.trim() ||
      addr.town?.trim() ||
      addr.village?.trim() ||
      null;
    return city || null;
  } catch {
    return null;
  }
}

/**
 * Look up city and state for an Indian PIN code.
 *
 * State is resolved instantly from the bundled local map — no waiting.
 * City is fetched from external APIs (with Nominatim fallback).
 * Even if city lookup fails, state is always returned if the prefix is known.
 */
export async function lookupIndianPincode(
  pincode: string,
  signal?: AbortSignal
): Promise<PincodeLookupResult | null> {
  // Resolve state from local bundled data — instant, zero network cost.
  const localState = getStateFromPincode(pincode);

  // Try to get city from API.
  const city =
    (await tryCityFromPostalPincode(pincode, signal)) ??
    (await tryCityFromNominatim(pincode, signal)) ??
    '';

  // If we got at least the state locally, return what we have.
  if (localState) {
    return { city, state: localState };
  }

  // Unknown prefix — only return if API gave us something complete.
  if (city) {
    return { city, state: '' };
  }

  return null;
}
