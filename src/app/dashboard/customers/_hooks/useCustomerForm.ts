
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useDebounce } from '@/lib/useDebounce';
import { lookupIndianPincode } from '@/lib/pincodeLookup';
import { normalizeSearchForServer } from '@/lib/listQuery';
import {
  customerSearchText,
  formatCustomerOptionLabel,
} from '@/lib/customerSearch';
import {
  DEFAULT_PHONE_COUNTRY_ISO,
  EMAIL_REGEX,
  NAME_REGEX,
  digitsOnly,
  getCountryIsoByCode,
  getPhoneCodeByIso,
  validatePhoneNumberForCountry,
} from '@/lib/customerFormOptions';
import { optionalDigits, optionalId, optionalText } from '@/lib/customerPayload';
import type { CustomerFormData, CustomerRow, PhoneFieldErrors } from '../_lib/types';

export const initialFormData: CustomerFormData = {
  name: '',
  phoneCountryIso: DEFAULT_PHONE_COUNTRY_ISO,
  phone: '',
  alterPhoneCountryIso: DEFAULT_PHONE_COUNTRY_ISO,
  alterPhone: '',
  whatsappCountryIso: DEFAULT_PHONE_COUNTRY_ISO,
  whatsappNumber: '',
  email: '',
  caste: '',
  country: 'India',
  pincode: '',
  city: '',
  state: '',
  street1: '',
  street2: '',
  facebookProfile: '',
  instagramHandle: '',
  twitter: '',
  linkedin: '',
  referredById: '',
  priority: '3',
  rating: '0',
  notes: '',
};

function getErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.response?.data?.errors?.[0]?.message ||
    fallback
  );
}

/**
 * Owns the create/edit customer form: state, validation, PIN-code autofill,
 * the hybrid referred-by picker, and save. The list side only provides
 * `onSaved` (refetch) and `useServer` (referrer picker mode).
 */
export function useCustomerForm({
  useServer,
  onSaved,
}: {
  useServer: boolean;
  onSaved: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [loadingFormData, setLoadingFormData] = useState(false);
  const [showCreatePrompt, setShowCreatePrompt] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [isWhatsappDifferent, setIsWhatsappDifferent] = useState(false);
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
  const [emailFieldError, setEmailFieldError] = useState('');
  const [pincodeLookupLoading, setPincodeLookupLoading] = useState(false);
  const [pincodeLookupError, setPincodeLookupError] = useState('');
  const [phoneFieldErrors, setPhoneFieldErrors] = useState<PhoneFieldErrors>({});
  const debouncedPincode = useDebounce(formData.pincode, 350);

  // PIN-code → city/state autofill (Indian 6-digit PINs only).
  useEffect(() => {
    if (!showCreatePrompt) return;

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
  }, [debouncedPincode, formData.country, showCreatePrompt]);

  // Hybrid referred-by picker. In server mode we query the server across ALL
  // customers (so anyone is findable) and pin the already-selected referrer so
  // the field is never blank when editing. In legacy mode the in-memory
  // referrerOptions are used (Combobox without onSearch).
  const [pinnedReferrer, setPinnedReferrer] = useState<CustomerRow | null>(null);

  useEffect(() => {
    if (!useServer) return;
    const id = formData.referredById;
    if (!id) {
      setPinnedReferrer(null);
      return;
    }
    if (pinnedReferrer?.id === id) return;
    let cancelled = false;
    void api
      .getCustomer(id)
      .then((res) => {
        const c = res?.data?.data?.customer;
        if (!cancelled && c) setPinnedReferrer(c as unknown as CustomerRow);
      })
      .catch(() => {
        /* leave unpinned on failure; field still works by id */
      });
    return () => {
      cancelled = true;
    };
  }, [useServer, formData.referredById, pinnedReferrer?.id]);

  const referrerToOption = useCallback(
    (customer: CustomerRow) => ({
      value: customer.id,
      label: formatCustomerOptionLabel(customer),
      secondary: customer.phone,
      searchText: customerSearchText(customer),
    }),
    []
  );

  const loadReferrersPage = useCallback(
    async (query: string, page: number) => {
      const trimmed = query.trim();
      // On open/empty: starter batch in default order. On typing (>=2 chars):
      // query the server across all customers. Either way the dropdown loads
      // the next page as the user scrolls (page 2, 3, …).
      const base =
        trimmed.length >= 2
          ? { search: normalizeSearchForServer(trimmed) }
          : { sort: 'name', order: 'asc' as const };
      const res = await api.getCustomers({ ...base, limit: 50, page });
      const rows = (res?.data?.data?.customers || []) as unknown as CustomerRow[];
      const totalPages = Math.max(1, res?.data?.data?.pagination?.totalPages ?? 1);
      // Pin the already-selected referrer only on the first page so the field
      // is never blank when editing; later pages append plain rows.
      const merged =
        page === 1 && pinnedReferrer
          ? [pinnedReferrer, ...rows.filter((r) => r.id !== pinnedReferrer.id)]
          : rows;
      return { options: merged.map(referrerToOption), hasMore: page < totalPages };
    },
    [pinnedReferrer, referrerToOption]
  );

  const resetCreateForm = () => {
    setEditingCustomerId(null);
    setLoadingFormData(false);
    setFormData(initialFormData);
    setIsWhatsappDifferent(false);
    setEmailFieldError('');
    setPincodeLookupLoading(false);
    setPincodeLookupError('');
    setPhoneFieldErrors({});
  };

  const closeCreatePrompt = () => {
    if (saving || loadingFormData) {
      return;
    }
    setShowCreatePrompt(false);
    resetCreateForm();
  };

  const openCreatePrompt = () => {
    resetCreateForm();
    setShowCreatePrompt(true);
  };

  const openEditPrompt = async (id: string) => {
    try {
      setLoadingFormData(true);
      setPhoneFieldErrors({});
      setEmailFieldError('');
      const response = await api.getCustomer(id);
      const customer = response?.data?.data?.customer;

      if (!customer) {
        toast.error('Customer not found');
        return;
      }

      const primaryCountryCode =
        customer.phoneCountryCode || getPhoneCodeByIso(DEFAULT_PHONE_COUNTRY_ISO);
      const alterPhone = customer.alterPhone || customer.alternatePhone || '';
      const whatsappNumber = customer.whatsappNumber || customer.whatsapp || '';
      const whatsappCountryCode =
        customer.whatsappCountryCode || primaryCountryCode;
      const isWhatsappDifferentFromPrimary = Boolean(whatsappNumber) &&
        (whatsappNumber !== (customer.phone || '') ||
          whatsappCountryCode !== primaryCountryCode);

      setEditingCustomerId(customer.id);
      setFormData({
        name: customer.name || '',
        phoneCountryIso: getCountryIsoByCode(primaryCountryCode),
        phone: customer.phone || '',
        alterPhoneCountryIso: getCountryIsoByCode(
          customer.alterPhoneCountryCode || primaryCountryCode
        ),
        alterPhone,
        whatsappCountryIso: getCountryIsoByCode(whatsappCountryCode),
        whatsappNumber: isWhatsappDifferentFromPrimary ? whatsappNumber : '',
        email: customer.email || '',
        caste: customer.caste || '',
        country: customer.country || 'India',
        pincode: customer.pincode || '',
        city: customer.city || '',
        state: customer.state || '',
        street1: customer.street1 || '',
        street2: customer.street2 || '',
        facebookProfile: customer.facebookProfile || '',
        instagramHandle: customer.instagramHandle || '',
        twitter: customer.twitter || '',
        linkedin: customer.linkedin || '',
        referredById: customer.referredById || '',
        priority:
          customer.priority !== null && customer.priority !== undefined
            ? String(customer.priority)
            : '3',
        rating: customer.rating || '0',
        notes: customer.notes || '',
      });
      setIsWhatsappDifferent(isWhatsappDifferentFromPrimary);
      setShowCreatePrompt(true);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        'Failed to load customer details'
      );
    } finally {
      setLoadingFormData(false);
    }
  };

  const validateCreateForm = (): string | null => {
    const name = formData.name.trim();
    const phone = digitsOnly(formData.phone);
    const secondPhone = digitsOnly(formData.alterPhone);
    const whatsappNumber = digitsOnly(formData.whatsappNumber);
    const email = formData.email.trim();
    const pincode = digitsOnly(formData.pincode);

    if (!name) {
      return 'Full name is required';
    }
    if (!NAME_REGEX.test(name)) {
      return 'Name can contain only letters and spaces';
    }
    if (!phone) {
      setPhoneFieldErrors({ phone: 'Phone number is required' });
      return 'Phone number is required';
    }
    const primaryPhoneError = validatePhoneNumberForCountry(
      phone,
      formData.phoneCountryIso,
      'Phone number'
    );
    if (primaryPhoneError) {
      setPhoneFieldErrors({ phone: primaryPhoneError });
      return primaryPhoneError;
    }
    if (secondPhone) {
      const secondaryPhoneError = validatePhoneNumberForCountry(
        secondPhone,
        formData.alterPhoneCountryIso,
        '2nd phone number'
      );
      if (secondaryPhoneError) {
        setPhoneFieldErrors({ alterPhone: secondaryPhoneError });
        return secondaryPhoneError;
      }
    }
    if (email && !EMAIL_REGEX.test(email)) {
      setEmailFieldError('Email must contain @ and .');
      return 'Email must contain @ and .';
    }
    if (isWhatsappDifferent) {
      if (!whatsappNumber) {
        return 'WhatsApp number is required when different from phone';
      }
      const whatsappError = validatePhoneNumberForCountry(
        whatsappNumber,
        formData.whatsappCountryIso,
        'WhatsApp number'
      );
      if (whatsappError) {
        setPhoneFieldErrors({ whatsappNumber: whatsappError });
        return whatsappError;
      }
    }
    if (pincode && (pincode.length < 4 || pincode.length > 10)) {
      return 'PIN code must contain 4 to 10 digits';
    }

    setPhoneFieldErrors({});
    setEmailFieldError('');
    return null;
  };

  const buildCustomerPayload = (mode: 'create' | 'update' = 'create') => {
    const name = formData.name.trim().replace(/\s+/g, ' ');
    const phone = digitsOnly(formData.phone);
    const alterPhone = digitsOnly(formData.alterPhone);
    const whatsappNumber = isWhatsappDifferent
      ? digitsOnly(formData.whatsappNumber)
      : phone;
    const phoneCountryCode = getPhoneCodeByIso(formData.phoneCountryIso);
    const alterPhoneCountryCode = getPhoneCodeByIso(formData.alterPhoneCountryIso);
    const whatsappCountryCode = isWhatsappDifferent
      ? getPhoneCodeByIso(formData.whatsappCountryIso)
      : phoneCountryCode;
    const country = formData.country.trim();
    const city = formData.city.trim();
    const state = formData.state.trim();
    const pincode = digitsOnly(formData.pincode);
    const street1 = formData.street1.trim();
    const street2 = formData.street2.trim();
    const addressParts = [street1, street2, city, state, pincode, country].filter(
      Boolean
    );
    const address = addressParts.length > 0 ? addressParts.join(', ') : optionalText('', mode);

    return {
      name,
      phone,
      phoneCountryCode,
      email: optionalText(formData.email, mode),
      alterPhone: optionalDigits(formData.alterPhone, mode),
      alterPhoneCountryCode: alterPhone
        ? alterPhoneCountryCode
        : optionalText('', mode),
      whatsappNumber: optionalDigits(
        isWhatsappDifferent ? formData.whatsappNumber : formData.phone,
        mode
      ),
      whatsappCountryCode: whatsappNumber ? whatsappCountryCode : optionalText('', mode),
      caste: optionalText(formData.caste, mode),
      country: optionalText(country, mode),
      pincode: optionalDigits(formData.pincode, mode),
      city: optionalText(city, mode),
      state: optionalText(state, mode),
      street1: optionalText(street1, mode),
      street2: optionalText(street2, mode),
      address,
      facebookProfile: optionalText(formData.facebookProfile, mode),
      instagramHandle: optionalText(formData.instagramHandle, mode),
      twitter: optionalText(formData.twitter, mode),
      linkedin: optionalText(formData.linkedin, mode),
      referredById: optionalId(formData.referredById, mode),
      priority: formData.priority ? Number(formData.priority) : undefined,
      rating: optionalText(formData.rating, mode),
      notes: optionalText(formData.notes, mode),
    };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailFieldError('');
    setPhoneFieldErrors({});
    const validationError = validateCreateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setSaving(true);
      const payload = buildCustomerPayload(editingCustomerId ? 'update' : 'create');
      if (editingCustomerId) {
        await api.updateCustomer(editingCustomerId, payload);
      } else {
        await api.createCustomer(payload);
      }
      toast.success(
        editingCustomerId
          ? 'Customer updated successfully'
          : 'Customer created successfully'
      );
      setShowCreatePrompt(false);
      resetCreateForm();
      await onSaved();
    } catch (error: any) {
      const serverValidationErrors = error?.response?.data?.errors;
      if (Array.isArray(serverValidationErrors)) {
        const nextErrors: PhoneFieldErrors = {};
        let nextEmailError = '';
        serverValidationErrors.forEach((entry: any) => {
          const field = String(entry?.field || '');
          if (field.endsWith('phone') && !nextErrors.phone) {
            nextErrors.phone = entry?.message;
          }
          if (
            (field.endsWith('alterPhone') || field.endsWith('alternatePhone')) &&
            !nextErrors.alterPhone
          ) {
            nextErrors.alterPhone = entry?.message;
          }
          if (
            (field.endsWith('whatsappNumber') || field.endsWith('whatsapp')) &&
            !nextErrors.whatsappNumber
          ) {
            nextErrors.whatsappNumber = entry?.message;
          }
          if (field.endsWith('email') && !nextEmailError) {
            nextEmailError = entry?.message || '';
          }
        });
        setPhoneFieldErrors(nextErrors);
        setEmailFieldError(nextEmailError);
      }
      const message = getErrorMessage(
        error,
        editingCustomerId ? 'Failed to update customer' : 'Failed to create customer'
      );
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return {
    // modal state
    showCreatePrompt,
    openCreatePrompt,
    closeCreatePrompt,
    openEditPrompt,
    editingCustomerId,
    loadingFormData,
    saving,
    // form state
    formData,
    setFormData,
    isWhatsappDifferent,
    setIsWhatsappDifferent,
    phoneFieldErrors,
    setPhoneFieldErrors,
    emailFieldError,
    setEmailFieldError,
    pincodeLookupLoading,
    pincodeLookupError,
    // referred-by picker
    pinnedReferrer,
    referrerToOption,
    loadReferrersPage,
    // submit
    handleSubmit,
  };
}

export type CustomerFormApi = ReturnType<typeof useCustomerForm>;
