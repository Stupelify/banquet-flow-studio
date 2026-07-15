
import { Link } from '@/lib/router-compat';
import { useRouter } from '@/lib/router-compat';
import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ArrowLeft, Save } from 'lucide-react';
import {
  COUNTRY_OPTIONS,
  COUNTRY_DIAL_CODE_OPTIONS,
  DEFAULT_PHONE_COUNTRY_ISO,
  EMAIL_REGEX,
  NAME_REGEX,
  PRIORITY_OPTIONS,
  digitsOnly,
  getDialCodeOption,
  getPhoneCodeByIso,
  getExpectedPhoneDigits,
  sanitizeNameInput,
  validatePhoneNumberForCountry,
} from '@/lib/customerFormOptions';
import { lookupIndianPincode } from '@/lib/pincodeLookup';
import { INDIA_STATES } from '@/lib/indiaData';
import { useDebounce } from '@/lib/useDebounce';

interface CustomerFormData {
  name: string;
  phoneCountryIso: string;
  phone: string;
  email: string;
  priority: string;
  country: string;
  pincode: string;
  city: string;
  state: string;
  address: string;
  notes: string;
}

const initialFormData: CustomerFormData = {
  name: '',
  phoneCountryIso: DEFAULT_PHONE_COUNTRY_ISO,
  phone: '',
  email: '',
  priority: '3',
  country: 'India',
  pincode: '',
  city: '',
  state: '',
  address: '',
  notes: '',
};

export default function CreateCustomerPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [pincodeLookupLoading, setPincodeLookupLoading] = useState(false);
  const [pincodeLookupError, setPincodeLookupError] = useState('');
  const phoneDigits = getExpectedPhoneDigits(formData.phoneCountryIso);
  const debouncedPincode = useDebounce(formData.pincode, 350);

  const setField = (field: keyof CustomerFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const country = formData.country.trim().toLowerCase();
    const pincode = digitsOnly(debouncedPincode);

    if (country !== 'india' || !pincode || pincode.length !== 6) {
      setPincodeLookupLoading(false);
      setPincodeLookupError('');
      return;
    }

    const controller = new AbortController();

    const runLookup = async () => {
      try {
        setPincodeLookupLoading(true);
        setPincodeLookupError('');
        const result = await lookupIndianPincode(pincode, controller.signal);

        if (!result) {
          setPincodeLookupError('Could not find city/state for this PIN code.');
          return;
        }

        setFormData((prev) =>
          digitsOnly(prev.pincode) === pincode
            ? { ...prev, city: result.city, state: result.state }
            : prev
        );
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        setPincodeLookupError('PIN lookup failed. Enter city/state manually.');
      } finally {
        if (!controller.signal.aborted) {
          setPincodeLookupLoading(false);
        }
      }
    };

    void runLookup();

    return () => controller.abort();
  }, [debouncedPincode, formData.country]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPhoneError('');
    setEmailError('');

    const name = formData.name.trim();
    const phone = digitsOnly(formData.phone);
    const email = formData.email.trim();
    const pincode = digitsOnly(formData.pincode);

    if (!name || !phone) {
      toast.error('Name and phone are required');
      return;
    }
    if (!NAME_REGEX.test(name)) {
      toast.error('Name can contain only letters and spaces');
      return;
    }
    const phoneError = validatePhoneNumberForCountry(
      phone,
      formData.phoneCountryIso,
      'Phone number'
    );
    if (phoneError) {
      setPhoneError(phoneError);
      toast.error(phoneError);
      return;
    }
    if (email && !EMAIL_REGEX.test(email)) {
      const message = 'Email must contain @ and .';
      setEmailError(message);
      toast.error(message);
      return;
    }
    if (pincode && (pincode.length < 4 || pincode.length > 10)) {
      toast.error('PIN code must contain 4 to 10 digits');
      return;
    }

    try {
      setSaving(true);
      const response = await api.createCustomer({
        name,
        phone,
        phoneCountryCode: getPhoneCodeByIso(formData.phoneCountryIso),
        email: email || undefined,
        priority: formData.priority ? Number(formData.priority) : 3,
        country: formData.country.trim() || undefined,
        pincode: pincode || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        address: formData.address.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });

      const customerId = response.data.data.customer.id as string;
      toast.success('Customer created successfully');
      router.push(`/dashboard/customers/${customerId}`);
    } catch (error: any) {
      const serverPhoneError = error?.response?.data?.errors?.find((entry: any) =>
        String(entry?.field || '').endsWith('phone')
      )?.message;
      const serverEmailError = error?.response?.data?.errors?.find((entry: any) =>
        String(entry?.field || '').endsWith('email')
      )?.message;
      if (serverPhoneError) {
        setPhoneError(serverPhoneError);
      }
      if (serverEmailError) {
        setEmailError(serverEmailError);
      }
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.response?.data?.errors?.[0]?.message ||
        'Failed to create customer';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link href="/dashboard/customers" className="btn btn-secondary">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="page-title">Add Customer</h1>
        </div>
      </div>

      <form onSubmit={onSubmit} className="card space-y-4" noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Name *</label>
            <input
              value={formData.name}
              onChange={(e) => setField('name', sanitizeNameInput(e.target.value))}
              className="input"
              placeholder="Customer name"
              required
            />
          </div>
          <div>
            <label className="label">Phone *</label>
            <div className="grid grid-cols-[180px,1fr] gap-2">
              <select
                value={formData.phoneCountryIso}
                onChange={(e) => {
                  const nextIso = e.target.value;
                  const digits = getExpectedPhoneDigits(nextIso);
                  setPhoneError('');
                  setFormData((prev) => ({
                    ...prev,
                    phoneCountryIso: nextIso,
                    phone: prev.phone.slice(0, digits),
                  }));
                }}
                className="input"
              >
                {COUNTRY_DIAL_CODE_OPTIONS.map((option) => (
                  <option key={option.iso2} value={option.iso2}>
                    {option.flag} {option.country} ({option.code})
                  </option>
                ))}
              </select>
              <input
                value={formData.phone}
                onChange={(e) => {
                  setPhoneError('');
                  setField('phone', digitsOnly(e.target.value).slice(0, phoneDigits));
                }}
                className="input"
                placeholder={`${phoneDigits}-digit number`}
                inputMode="numeric"
                minLength={phoneDigits}
                maxLength={phoneDigits}
                required
              />
            </div>
            {phoneError && <p className="mt-1 text-xs text-red-600">{phoneError}</p>}
            <p className="mt-1 text-xs text-[var(--text-4)]">
              {getDialCodeOption(formData.phoneCountryIso).country} numbers must be{' '}
              {phoneDigits} digits.
            </p>
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => {
                setEmailError('');
                setField('email', e.target.value);
              }}
              className="input"
              placeholder="Email address"
            />
            {emailError && <p className="mt-1 text-xs text-red-600">{emailError}</p>}
          </div>
          <div>
            <label className="label">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setField('priority', e.target.value)}
              className="input"
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Country</label>
            <select
              value={formData.country}
              onChange={(e) => setField('country', e.target.value)}
              className="input"
            >
              {COUNTRY_OPTIONS.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">PIN Code</label>
            <input
              value={formData.pincode}
              onChange={(e) => {
                setPincodeLookupError('');
                setField('pincode', digitsOnly(e.target.value));
              }}
              className="input"
              placeholder="PIN code"
              inputMode="numeric"
              maxLength={10}
            />
            {formData.country.trim().toLowerCase() === 'india' && (
              <p className="mt-1 text-xs text-[var(--text-4)]">
                {pincodeLookupLoading
                  ? 'Looking up city and state...'
                  : 'Enter a 6-digit Indian PIN code to auto-fill city and state.'}
              </p>
            )}
            {pincodeLookupError && <p className="mt-1 text-xs text-red-600">{pincodeLookupError}</p>}
          </div>
          <div>
            <label className="label">City</label>
            <input
              value={formData.city}
              onChange={(e) => setField('city', e.target.value)}
              className="input"
              placeholder="City"
            />
          </div>
          <div>
            <label className="label">State</label>
            {formData.country.trim().toLowerCase() === 'india' ? (
              <select
                value={formData.state}
                onChange={(e) => setField('state', e.target.value)}
                className="input"
              >
                <option value="">Select state</option>
                {INDIA_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <input
                value={formData.state}
                onChange={(e) => setField('state', e.target.value)}
                className="input"
                placeholder="State"
              />
            )}
          </div>
        </div>

        <div>
          <label className="label">Address</label>
          <textarea
            value={formData.address}
            onChange={(e) => setField('address', e.target.value)}
            className="input min-h-[96px]"
            placeholder="Address"
          />
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setField('notes', e.target.value)}
            className="input min-h-[96px]"
            placeholder="Internal notes"
          />
        </div>

        <div className="form-actions pt-2">
          <Link href="/dashboard/customers" className="btn btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <span className="inline-flex items-center gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Customer'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
