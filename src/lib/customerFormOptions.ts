import phoneDialCodeOptions from './phoneDialCodeOptions.json';

export interface CountryDialCodeOption {
  iso2: string;
  country: string;
  flag: string;
  code: string;
  digits: number;
}

export const COUNTRY_DIAL_CODE_OPTIONS =
  phoneDialCodeOptions as CountryDialCodeOption[];

const DEFAULT_DIAL_CODE_OPTION =
  COUNTRY_DIAL_CODE_OPTIONS.find((option) => option.iso2 === 'IN') ??
  COUNTRY_DIAL_CODE_OPTIONS[0];

export const COUNTRY_OPTIONS = [
  'Afghanistan',
  'Albania',
  'Algeria',
  'Andorra',
  'Angola',
  'Antigua and Barbuda',
  'Argentina',
  'Armenia',
  'Australia',
  'Austria',
  'Azerbaijan',
  'Bahamas',
  'Bahrain',
  'Bangladesh',
  'Barbados',
  'Belarus',
  'Belgium',
  'Belize',
  'Benin',
  'Bhutan',
  'Bolivia',
  'Bosnia and Herzegovina',
  'Botswana',
  'Brazil',
  'Brunei',
  'Bulgaria',
  'Burkina Faso',
  'Burundi',
  'Cabo Verde',
  'Cambodia',
  'Cameroon',
  'Canada',
  'Central African Republic',
  'Chad',
  'Chile',
  'China',
  'Colombia',
  'Comoros',
  'Congo',
  'Costa Rica',
  "Cote d'Ivoire",
  'Croatia',
  'Cuba',
  'Cyprus',
  'Czechia',
  'Democratic Republic of the Congo',
  'Denmark',
  'Djibouti',
  'Dominica',
  'Dominican Republic',
  'Ecuador',
  'Egypt',
  'El Salvador',
  'Equatorial Guinea',
  'Eritrea',
  'Estonia',
  'Eswatini',
  'Ethiopia',
  'Fiji',
  'Finland',
  'France',
  'Gabon',
  'Gambia',
  'Georgia',
  'Germany',
  'Ghana',
  'Greece',
  'Grenada',
  'Guatemala',
  'Guinea',
  'Guinea-Bissau',
  'Guyana',
  'Haiti',
  'Honduras',
  'Hungary',
  'Iceland',
  'India',
  'Indonesia',
  'Iran',
  'Iraq',
  'Ireland',
  'Israel',
  'Italy',
  'Jamaica',
  'Japan',
  'Jordan',
  'Kazakhstan',
  'Kenya',
  'Kiribati',
  'Kuwait',
  'Kyrgyzstan',
  'Laos',
  'Latvia',
  'Lebanon',
  'Lesotho',
  'Liberia',
  'Libya',
  'Liechtenstein',
  'Lithuania',
  'Luxembourg',
  'Madagascar',
  'Malawi',
  'Malaysia',
  'Maldives',
  'Mali',
  'Malta',
  'Marshall Islands',
  'Mauritania',
  'Mauritius',
  'Mexico',
  'Micronesia',
  'Moldova',
  'Monaco',
  'Mongolia',
  'Montenegro',
  'Morocco',
  'Mozambique',
  'Myanmar',
  'Namibia',
  'Nauru',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Nicaragua',
  'Niger',
  'Nigeria',
  'North Korea',
  'North Macedonia',
  'Norway',
  'Oman',
  'Pakistan',
  'Palau',
  'Panama',
  'Papua New Guinea',
  'Paraguay',
  'Peru',
  'Philippines',
  'Poland',
  'Portugal',
  'Qatar',
  'Romania',
  'Russia',
  'Rwanda',
  'Saint Kitts and Nevis',
  'Saint Lucia',
  'Saint Vincent and the Grenadines',
  'Samoa',
  'San Marino',
  'Sao Tome and Principe',
  'Saudi Arabia',
  'Senegal',
  'Serbia',
  'Seychelles',
  'Sierra Leone',
  'Singapore',
  'Slovakia',
  'Slovenia',
  'Solomon Islands',
  'Somalia',
  'South Africa',
  'South Korea',
  'South Sudan',
  'Spain',
  'Sri Lanka',
  'Sudan',
  'Suriname',
  'Sweden',
  'Switzerland',
  'Syria',
  'Taiwan',
  'Tajikistan',
  'Tanzania',
  'Thailand',
  'Timor-Leste',
  'Togo',
  'Tonga',
  'Trinidad and Tobago',
  'Tunisia',
  'Turkey',
  'Turkmenistan',
  'Tuvalu',
  'Uganda',
  'Ukraine',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Uruguay',
  'Uzbekistan',
  'Vanuatu',
  'Vatican City',
  'Venezuela',
  'Vietnam',
  'Yemen',
  'Zambia',
  'Zimbabwe',
] as const;

export const CASTE_OPTIONS = [
  'Marwari',
  'Jaiswal',
  'Gujarati',
  'Punjabi',
  'Bengali',
  'No Preference',
] as const;

export const PRIORITY_OPTIONS = [
  { label: '1 - Lowest', value: '1' },
  { label: '2 - Low', value: '2' },
  { label: '3 - Medium', value: '3' },
  { label: '4 - High', value: '4' },
  { label: '5 - Highest', value: '5' },
] as const;

export const NAME_REGEX = /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\d+$/;

export const DEFAULT_PHONE_COUNTRY_ISO = DEFAULT_DIAL_CODE_OPTION.iso2;
export const DEFAULT_PHONE_COUNTRY_CODE = DEFAULT_DIAL_CODE_OPTION.code;

export function sanitizeNameInput(value: string): string {
  return value.replace(/[^A-Za-z ]/g, '').replace(/\s{2,}/g, ' ');
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function getDialCodeOptionByCode(
  code: string | undefined
): CountryDialCodeOption {
  return (
    COUNTRY_DIAL_CODE_OPTIONS.find((option) => option.code === code) ??
    DEFAULT_DIAL_CODE_OPTION
  );
}

export function getDialCodeOptionByIso(
  iso2: string | undefined
): CountryDialCodeOption {
  return (
    COUNTRY_DIAL_CODE_OPTIONS.find((option) => option.iso2 === iso2) ??
    DEFAULT_DIAL_CODE_OPTION
  );
}

export function getDialCodeOption(
  countrySelector: string | undefined
): CountryDialCodeOption {
  if (countrySelector?.startsWith('+')) {
    return getDialCodeOptionByCode(countrySelector);
  }
  return getDialCodeOptionByIso(countrySelector);
}

export function getCountryIsoByCode(code: string | undefined): string {
  return getDialCodeOptionByCode(code).iso2;
}

export function getPhoneCodeByIso(iso2: string | undefined): string {
  return getDialCodeOptionByIso(iso2).code;
}

export function getExpectedPhoneDigits(
  countrySelector: string | undefined
): number {
  return getDialCodeOption(countrySelector).digits;
}

export function getDialCodeSelectLabel(option: CountryDialCodeOption): string {
  return `${option.flag} ${option.country} (${option.code})`;
}

export function validatePhoneNumberForCountry(
  number: string,
  countrySelector: string | undefined,
  label: string
): string | null {
  if (!PHONE_REGEX.test(number)) {
    return `${label} must contain only digits`;
  }

  const rule = getDialCodeOption(countrySelector);
  if (number.length !== rule.digits) {
    return `${label} for ${rule.country} (${rule.code}) must be exactly ${rule.digits} digits`;
  }

  return null;
}
