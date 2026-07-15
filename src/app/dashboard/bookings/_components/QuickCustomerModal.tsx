
import { useEffect, useState } from 'react';
import { Save, Star } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import FormPromptModal from '@/components/FormPromptModal';
import { TableSkeleton } from '@/components/Skeletons';
import { useDebounce } from '@/lib/useDebounce';
import { lookupIndianPincode } from '@/lib/pincodeLookup';
import { INDIA_STATES } from '@/lib/indiaData';
import { handleEnterAsTabKeyDown } from '@/lib/focusNextField';
import {
  CASTE_OPTIONS,
  COUNTRY_DIAL_CODE_OPTIONS,
  COUNTRY_OPTIONS,
  EMAIL_REGEX,
  NAME_REGEX,
  PRIORITY_OPTIONS,
  digitsOnly,
  getDialCodeOption,
  getExpectedPhoneDigits,
  getPhoneCodeByIso,
  sanitizeNameInput,
  validatePhoneNumberForCountry,
} from '@/lib/customerFormOptions';
import Combobox from '@/components/Combobox';
import { Field, Input, Select, Textarea } from '@/components/ui';
import { customerSearchText } from '@/lib/customerSearch';
import {
  formatCustomerLabel,
  initialInlineCustomerFormData,
  type CustomerOption,
  type InlineCustomerFormData,
} from '../_lib/types';

interface QuickCustomerModalProps {
  open: boolean;
  onClose: () => void;
  canAddCustomer: boolean;
  /** In-memory customers used by the referred-by picker. */
  referrerOptions: CustomerOption[];
  /**
   * Called after the customer is created on the server. The page refreshes its
   * customer options and selects the new customer in the booking form.
   */
  onCreated: (
    createdCustomerId: string | undefined,
    match: { name: string; phone: string }
  ) => Promise<void>;
}

/** Quick "Add Customer" modal inside the booking form. Moved verbatim from page.tsx. */
export default function QuickCustomerModal({
  open,
  onClose,
  canAddCustomer,
  referrerOptions,
  onCreated,
}: QuickCustomerModalProps) {
  const [inlineCustomerFormData, setInlineCustomerFormData] = useState<InlineCustomerFormData>(
    initialInlineCustomerFormData
  );
  const [inlineCustomerSaving, setInlineCustomerSaving] = useState(false);
  const [isInlineWhatsappDifferent, setIsInlineWhatsappDifferent] = useState(false);
  const [inlineCustomerEmailError, setInlineCustomerEmailError] = useState('');
  const [inlineCustomerPincodeLookupLoading, setInlineCustomerPincodeLookupLoading] =
    useState(false);
  const [inlineCustomerPincodeLookupError, setInlineCustomerPincodeLookupError] = useState('');
  const [inlineCustomerPhoneErrors, setInlineCustomerPhoneErrors] = useState<{
    phone?: string;
    alterPhone?: string;
    whatsappNumber?: string;
  }>({});
  const debouncedInlineCustomerPincode = useDebounce(inlineCustomerFormData.pincode, 350);

  const inlinePrimaryPhoneDigits = getExpectedPhoneDigits(
    inlineCustomerFormData.phoneCountryIso
  );
  const inlineSecondaryPhoneDigits = getExpectedPhoneDigits(
    inlineCustomerFormData.alterPhoneCountryIso
  );
  const inlineWhatsappPhoneDigits = getExpectedPhoneDigits(
    inlineCustomerFormData.whatsappCountryIso
  );

  useEffect(() => {
    if (!open) return;

    const country = inlineCustomerFormData.country.trim().toLowerCase();
    const pincode = digitsOnly(debouncedInlineCustomerPincode);

    if (country !== 'india') {
      setInlineCustomerPincodeLookupLoading(false);
      setInlineCustomerPincodeLookupError('');
      return;
    }

    if (!pincode) {
      setInlineCustomerPincodeLookupLoading(false);
      setInlineCustomerPincodeLookupError('');
      return;
    }

    if (pincode.length !== 6) {
      setInlineCustomerPincodeLookupLoading(false);
      setInlineCustomerPincodeLookupError('');
      return;
    }

    const controller = new AbortController();

    const lookupPincode = async () => {
      try {
        setInlineCustomerPincodeLookupLoading(true);
        setInlineCustomerPincodeLookupError('');

        const result = await lookupIndianPincode(pincode, controller.signal);

        if (!result) {
          setInlineCustomerPincodeLookupError('Could not find city/state for this PIN code.');
          return;
        }

        setInlineCustomerFormData((prev) =>
          digitsOnly(prev.pincode) === pincode
            ? {
                ...prev,
                city: result.city || prev.city,
                state: result.state || prev.state,
              }
            : prev
        );
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        setInlineCustomerPincodeLookupError('PIN lookup failed. Enter city/state manually.');
      } finally {
        if (!controller.signal.aborted) {
          setInlineCustomerPincodeLookupLoading(false);
        }
      }
    };

    void lookupPincode();

    return () => controller.abort();
  }, [
    debouncedInlineCustomerPincode,
    inlineCustomerFormData.country,
    open,
  ]);

  const resetInlineCustomerForm = () => {
    setInlineCustomerFormData(initialInlineCustomerFormData);
    setIsInlineWhatsappDifferent(false);
    setInlineCustomerEmailError('');
    setInlineCustomerPincodeLookupLoading(false);
    setInlineCustomerPincodeLookupError('');
    setInlineCustomerPhoneErrors({});
  };

  const handleClose = () => {
    if (inlineCustomerSaving) return;
    onClose();
    resetInlineCustomerForm();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canAddCustomer) {
      toast.error('You do not have permission to add customers.');
      return;
    }

    const name = inlineCustomerFormData.name.trim().replace(/\s+/g, ' ');
    const phone = digitsOnly(inlineCustomerFormData.phone);
    const secondPhone = digitsOnly(inlineCustomerFormData.alterPhone);
    const whatsappNumber = digitsOnly(inlineCustomerFormData.whatsappNumber);
    const email = inlineCustomerFormData.email.trim();
    const pincode = digitsOnly(inlineCustomerFormData.pincode);

    setInlineCustomerEmailError('');
    setInlineCustomerPhoneErrors({});

    if (!name) {
      toast.error('Full name is required');
      return;
    }
    if (!NAME_REGEX.test(name)) {
      toast.error('Name can contain only letters and spaces');
      return;
    }
    if (!phone) {
      const message = 'Phone number is required';
      setInlineCustomerPhoneErrors({ phone: message });
      toast.error(message);
      return;
    }

    const phoneValidationMessage = validatePhoneNumberForCountry(
      phone,
      inlineCustomerFormData.phoneCountryIso,
      'Phone number'
    );
    if (phoneValidationMessage) {
      setInlineCustomerPhoneErrors({ phone: phoneValidationMessage });
      toast.error(phoneValidationMessage);
      return;
    }

    if (secondPhone) {
      const secondPhoneMessage = validatePhoneNumberForCountry(
        secondPhone,
        inlineCustomerFormData.alterPhoneCountryIso,
        '2nd phone number'
      );
      if (secondPhoneMessage) {
        setInlineCustomerPhoneErrors({ alterPhone: secondPhoneMessage });
        toast.error(secondPhoneMessage);
        return;
      }
    }

    if (isInlineWhatsappDifferent) {
      if (!whatsappNumber) {
        toast.error('WhatsApp number is required when different from phone');
        return;
      }
      const whatsappMessage = validatePhoneNumberForCountry(
        whatsappNumber,
        inlineCustomerFormData.whatsappCountryIso,
        'WhatsApp number'
      );
      if (whatsappMessage) {
        setInlineCustomerPhoneErrors({ whatsappNumber: whatsappMessage });
        toast.error(whatsappMessage);
        return;
      }
    }

    if (email && !EMAIL_REGEX.test(email)) {
      const message = 'Email must contain @ and .';
      setInlineCustomerEmailError(message);
      toast.error(message);
      return;
    }

    if (pincode && (pincode.length < 4 || pincode.length > 10)) {
      toast.error('PIN code must contain 4 to 10 digits');
      return;
    }

    const phoneCountryCode = getPhoneCodeByIso(inlineCustomerFormData.phoneCountryIso);
    const alterPhoneCountryCode = getPhoneCodeByIso(inlineCustomerFormData.alterPhoneCountryIso);
    const effectiveWhatsappNumber = isInlineWhatsappDifferent ? whatsappNumber : phone;
    const whatsappCountryCode = isInlineWhatsappDifferent
      ? getPhoneCodeByIso(inlineCustomerFormData.whatsappCountryIso)
      : phoneCountryCode;
    const country = inlineCustomerFormData.country.trim();
    const city = inlineCustomerFormData.city.trim();
    const state = inlineCustomerFormData.state.trim();
    const street1 = inlineCustomerFormData.street1.trim();
    const street2 = inlineCustomerFormData.street2.trim();
    const addressParts = [street1, street2, city, state, pincode, country].filter(Boolean);

    try {
      setInlineCustomerSaving(true);
      const response = await api.createCustomer({
        name,
        phone,
        phoneCountryCode,
        email: email || undefined,
        alterPhone: secondPhone || undefined,
        alterPhoneCountryCode: secondPhone ? alterPhoneCountryCode : undefined,
        whatsappNumber: effectiveWhatsappNumber || undefined,
        whatsappCountryCode: effectiveWhatsappNumber ? whatsappCountryCode : undefined,
        caste: inlineCustomerFormData.caste || undefined,
        country: country || undefined,
        pincode: pincode || undefined,
        city: city || undefined,
        state: state || undefined,
        street1: street1 || undefined,
        street2: street2 || undefined,
        address: addressParts.length > 0 ? addressParts.join(', ') : undefined,
        facebookProfile: inlineCustomerFormData.facebookProfile.trim() || undefined,
        instagramHandle: inlineCustomerFormData.instagramHandle.trim() || undefined,
        twitter: inlineCustomerFormData.twitter.trim() || undefined,
        linkedin: inlineCustomerFormData.linkedin.trim() || undefined,
        referredById: inlineCustomerFormData.referredById || undefined,
        priority: inlineCustomerFormData.priority
          ? Number(inlineCustomerFormData.priority)
          : undefined,
        rating: inlineCustomerFormData.rating || undefined,
        notes: inlineCustomerFormData.notes.trim() || undefined,
      });
      const createdCustomerId = response?.data?.data?.customer?.id as string | undefined;

      await onCreated(createdCustomerId, { name, phone });

      toast.success('Customer added successfully');
      onClose();
      resetInlineCustomerForm();
    } catch (error: any) {
      const serverValidationErrors = error?.response?.data?.errors;
      if (Array.isArray(serverValidationErrors)) {
        const nextErrors: {
          phone?: string;
          alterPhone?: string;
          whatsappNumber?: string;
        } = {};
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
        setInlineCustomerPhoneErrors(nextErrors);
        setInlineCustomerEmailError(nextEmailError);
      }
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.response?.data?.errors?.[0]?.message ||
        'Failed to create customer';
      toast.error(message);
    } finally {
      setInlineCustomerSaving(false);
    }
  };

  return (
      <FormPromptModal
        open={open}
        title="Add Customer"
        onClose={handleClose}
        widthClass="max-w-6xl"
      >
        <form onSubmit={handleSubmit} className="space-y-7" noValidate>
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-1)]">Personal Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4">
                <Field label="Full Name" required>
                  {(control) => (
                    <Input
                      {...control}
                      value={inlineCustomerFormData.name}
                      onChange={(e) =>
                        setInlineCustomerFormData((prev) => ({
                          ...prev,
                          name: sanitizeNameInput(e.target.value),
                        }))
                      }
                      placeholder="Full name"
                      required
                    />
                  )}
                </Field>
              </div>
              <div className="md:col-span-4">
                <Field
                  label="Phone Number"
                  required
                  error={inlineCustomerPhoneErrors.phone}
                  hint={`${getDialCodeOption(inlineCustomerFormData.phoneCountryIso).country} numbers must be ${inlinePrimaryPhoneDigits} digits.`}
                >
                  {(control) => (
                    <div className="grid grid-cols-[180px,1fr] gap-2">
                      <Select
                        value={inlineCustomerFormData.phoneCountryIso}
                        onChange={(e) => {
                          const nextIso = e.target.value;
                          const digits = getExpectedPhoneDigits(nextIso);
                          setInlineCustomerPhoneErrors((prev) => ({ ...prev, phone: undefined }));
                          setInlineCustomerFormData((prev) => ({
                            ...prev,
                            phoneCountryIso: nextIso,
                            phone: prev.phone.slice(0, digits),
                            whatsappCountryIso: isInlineWhatsappDifferent
                              ? prev.whatsappCountryIso
                              : nextIso,
                          }));
                        }}
                        aria-label="Phone country code"
                      >
                        {COUNTRY_DIAL_CODE_OPTIONS.map((option) => (
                          <option key={option.iso2} value={option.iso2}>
                            {option.flag} {option.country} ({option.code})
                          </option>
                        ))}
                      </Select>
                      <Input
                        {...control}
                        value={inlineCustomerFormData.phone}
                        onChange={(e) => {
                          setInlineCustomerPhoneErrors((prev) => ({ ...prev, phone: undefined }));
                          setInlineCustomerFormData((prev) => ({
                            ...prev,
                            phone: digitsOnly(e.target.value).slice(0, inlinePrimaryPhoneDigits),
                          }));
                        }}
                        placeholder={`${inlinePrimaryPhoneDigits}-digit number`}
                        inputMode="numeric"
                        minLength={inlinePrimaryPhoneDigits}
                        maxLength={inlinePrimaryPhoneDigits}
                        required
                      />
                    </div>
                  )}
                </Field>
              </div>
              <div className="md:col-span-4">
                <Field
                  label="2nd Phone No."
                  error={inlineCustomerPhoneErrors.alterPhone}
                  hint={`Optional. If entered, it must be exactly ${inlineSecondaryPhoneDigits} digits.`}
                >
                  {(control) => (
                    <div className="grid grid-cols-[180px,1fr] gap-2">
                      <Select
                        value={inlineCustomerFormData.alterPhoneCountryIso}
                        onChange={(e) => {
                          const nextIso = e.target.value;
                          const digits = getExpectedPhoneDigits(nextIso);
                          setInlineCustomerPhoneErrors((prev) => ({ ...prev, alterPhone: undefined }));
                          setInlineCustomerFormData((prev) => ({
                            ...prev,
                            alterPhoneCountryIso: nextIso,
                            alterPhone: prev.alterPhone.slice(0, digits),
                          }));
                        }}
                        aria-label="Second phone country code"
                      >
                        {COUNTRY_DIAL_CODE_OPTIONS.map((option) => (
                          <option key={`inline-alt-${option.iso2}`} value={option.iso2}>
                            {option.flag} {option.country} ({option.code})
                          </option>
                        ))}
                      </Select>
                      <Input
                        {...control}
                        value={inlineCustomerFormData.alterPhone}
                        onChange={(e) => {
                          setInlineCustomerPhoneErrors((prev) => ({ ...prev, alterPhone: undefined }));
                          setInlineCustomerFormData((prev) => ({
                            ...prev,
                            alterPhone: digitsOnly(e.target.value).slice(0, inlineSecondaryPhoneDigits),
                          }));
                        }}
                        placeholder={`${inlineSecondaryPhoneDigits}-digit number`}
                        inputMode="numeric"
                        maxLength={inlineSecondaryPhoneDigits}
                      />
                    </div>
                  )}
                </Field>
              </div>
              <div className="md:col-span-4">
                <Field label="Caste">
                  {(control) => (
                    <Select
                      {...control}
                      value={inlineCustomerFormData.caste}
                      onChange={(e) =>
                        setInlineCustomerFormData((prev) => ({ ...prev, caste: e.target.value }))
                      }
                      placeholder="Select caste"
                    >
                      {CASTE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
              <div className="md:col-span-4">
                <Field label="Email" error={inlineCustomerEmailError}>
                  {(control) => (
                    <Input
                      {...control}
                      type="email"
                      value={inlineCustomerFormData.email}
                      onChange={(e) => {
                        setInlineCustomerEmailError('');
                        setInlineCustomerFormData((prev) => ({ ...prev, email: e.target.value }));
                      }}
                      placeholder="name@example.com"
                    />
                  )}
                </Field>
              </div>
              <div className="md:col-span-4 flex items-end">
                <label className="inline-flex items-center gap-2 text-sm text-[var(--text-2)] pb-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[var(--border-2)] text-primary-600 focus:ring-primary-500"
                    checked={isInlineWhatsappDifferent}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsInlineWhatsappDifferent(checked);
                      if (!checked) {
                        setInlineCustomerPhoneErrors((prev) => ({
                          ...prev,
                          whatsappNumber: undefined,
                        }));
                        setInlineCustomerFormData((prev) => ({
                          ...prev,
                          whatsappNumber: '',
                          whatsappCountryIso: prev.phoneCountryIso,
                        }));
                      }
                    }}
                  />
                  Is WhatsApp different from phone?
                </label>
              </div>
              {isInlineWhatsappDifferent && (
                <div className="md:col-span-4">
                  <Field
                    label="WhatsApp Number"
                    required
                    error={inlineCustomerPhoneErrors.whatsappNumber}
                    hint={`Must be exactly ${inlineWhatsappPhoneDigits} digits.`}
                  >
                    {(control) => (
                      <div className="grid grid-cols-[180px,1fr] gap-2">
                        <Select
                          value={inlineCustomerFormData.whatsappCountryIso}
                          onChange={(e) => {
                            const nextIso = e.target.value;
                            const digits = getExpectedPhoneDigits(nextIso);
                            setInlineCustomerPhoneErrors((prev) => ({
                              ...prev,
                              whatsappNumber: undefined,
                            }));
                            setInlineCustomerFormData((prev) => ({
                              ...prev,
                              whatsappCountryIso: nextIso,
                              whatsappNumber: prev.whatsappNumber.slice(0, digits),
                            }));
                          }}
                          aria-label="WhatsApp country code"
                        >
                          {COUNTRY_DIAL_CODE_OPTIONS.map((option) => (
                            <option key={`inline-wa-${option.iso2}`} value={option.iso2}>
                              {option.flag} {option.country} ({option.code})
                            </option>
                          ))}
                        </Select>
                        <Input
                          {...control}
                          value={inlineCustomerFormData.whatsappNumber}
                          onChange={(e) => {
                            setInlineCustomerPhoneErrors((prev) => ({
                              ...prev,
                              whatsappNumber: undefined,
                            }));
                            setInlineCustomerFormData((prev) => ({
                              ...prev,
                              whatsappNumber: digitsOnly(e.target.value).slice(
                                0,
                                inlineWhatsappPhoneDigits
                              ),
                            }));
                          }}
                          placeholder={`${inlineWhatsappPhoneDigits}-digit number`}
                          inputMode="numeric"
                          minLength={inlineWhatsappPhoneDigits}
                          maxLength={inlineWhatsappPhoneDigits}
                          required
                        />
                      </div>
                    )}
                  </Field>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-1)]">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4">
                <Field label="Country">
                  {(control) => (
                    <Select
                      {...control}
                      value={inlineCustomerFormData.country}
                      onChange={(e) =>
                        setInlineCustomerFormData((prev) => ({ ...prev, country: e.target.value }))
                      }
                    >
                      {COUNTRY_OPTIONS.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
              <div className="md:col-span-4">
                <Field
                  label="PIN Code"
                  hint={
                    inlineCustomerFormData.country.trim().toLowerCase() === 'india'
                      ? inlineCustomerPincodeLookupLoading
                        ? 'Looking up city and state...'
                        : 'Enter a 6-digit Indian PIN code to auto-fill city and state.'
                      : undefined
                  }
                  error={inlineCustomerPincodeLookupError || undefined}
                >
                  {(control) => (
                    <Input
                      {...control}
                      value={inlineCustomerFormData.pincode}
                      onChange={(e) =>
                        setInlineCustomerFormData((prev) => ({
                          ...prev,
                          pincode: digitsOnly(e.target.value),
                        }))
                      }
                      placeholder="PIN code"
                      inputMode="numeric"
                      maxLength={10}
                    />
                  )}
                </Field>
              </div>
              <div className="md:col-span-4">
                <Field label="State">
                  {(control) =>
                    inlineCustomerFormData.country.trim().toLowerCase() === 'india' ? (
                      <Select
                        {...control}
                        value={inlineCustomerFormData.state}
                        onChange={(e) =>
                          setInlineCustomerFormData((prev) => ({ ...prev, state: e.target.value }))
                        }
                        placeholder="Select state"
                      >
                        {INDIA_STATES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        {...control}
                        value={inlineCustomerFormData.state}
                        onChange={(e) =>
                          setInlineCustomerFormData((prev) => ({ ...prev, state: e.target.value }))
                        }
                        placeholder="State"
                      />
                    )
                  }
                </Field>
              </div>
              <div className="md:col-span-4">
                <Field label="City">
                  {(control) => (
                    <Input
                      {...control}
                      value={inlineCustomerFormData.city}
                      onChange={(e) =>
                        setInlineCustomerFormData((prev) => ({ ...prev, city: e.target.value }))
                      }
                      placeholder="City"
                    />
                  )}
                </Field>
              </div>
              <div className="md:col-span-4">
                <Field label="Street One">
                  {(control) => (
                    <Input
                      {...control}
                      value={inlineCustomerFormData.street1}
                      onChange={(e) =>
                        setInlineCustomerFormData((prev) => ({ ...prev, street1: e.target.value }))
                      }
                      placeholder="Street one"
                    />
                  )}
                </Field>
              </div>
              <div className="md:col-span-4">
                <Field label="Street Two">
                  {(control) => (
                    <Input
                      {...control}
                      value={inlineCustomerFormData.street2}
                      onChange={(e) =>
                        setInlineCustomerFormData((prev) => ({ ...prev, street2: e.target.value }))
                      }
                      placeholder="Street two"
                    />
                  )}
                </Field>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-1)]">Social Links</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <Field label="Facebook">
                {(control) => (
                  <Input
                    {...control}
                    value={inlineCustomerFormData.facebookProfile}
                    onChange={(e) =>
                      setInlineCustomerFormData((prev) => ({
                        ...prev,
                        facebookProfile: e.target.value,
                      }))
                    }
                    placeholder="Facebook profile"
                  />
                )}
              </Field>
              <Field label="Instagram">
                {(control) => (
                  <Input
                    {...control}
                    value={inlineCustomerFormData.instagramHandle}
                    onChange={(e) =>
                      setInlineCustomerFormData((prev) => ({
                        ...prev,
                        instagramHandle: e.target.value,
                      }))
                    }
                    placeholder="Instagram handle"
                  />
                )}
              </Field>
              <Field label="Twitter">
                {(control) => (
                  <Input
                    {...control}
                    value={inlineCustomerFormData.twitter}
                    onChange={(e) =>
                      setInlineCustomerFormData((prev) => ({ ...prev, twitter: e.target.value }))
                    }
                    placeholder="Twitter"
                  />
                )}
              </Field>
              <Field label="LinkedIn">
                {(control) => (
                  <Input
                    {...control}
                    value={inlineCustomerFormData.linkedin}
                    onChange={(e) =>
                      setInlineCustomerFormData((prev) => ({ ...prev, linkedin: e.target.value }))
                    }
                    placeholder="LinkedIn"
                  />
                )}
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-1)]">Other Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4">
                <label className="label">Referred By</label>
                <Combobox
                  value={inlineCustomerFormData.referredById}
                  onChange={(val) =>
                    setInlineCustomerFormData((prev) => ({
                      ...prev,
                      referredById: val,
                    }))
                  }
                  options={referrerOptions.map((customer) => ({
                    value: customer.id,
                    label: formatCustomerLabel(customer),
                    secondary: customer.phone,
                    searchText: customerSearchText(customer),
                  }))}
                  placeholder="Search name or phone"
                  searchPlaceholder="Name or phone number"
                />
              </div>
              <div className="md:col-span-4">
                <Field label="Priority">
                  {(control) => (
                    <Select
                      {...control}
                      value={inlineCustomerFormData.priority}
                      onChange={(e) =>
                        setInlineCustomerFormData((prev) => ({ ...prev, priority: e.target.value }))
                      }
                      placeholder="Select priority"
                    >
                      {PRIORITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
              <div className="md:col-span-4">
                <label className="label">Rating</label>
                <div className="h-11 flex items-center gap-1 rounded-xl border border-[var(--border)] px-3">
                  {[1, 2, 3, 4, 5].map((value) => {
                    const current = Number(inlineCustomerFormData.rating || '0');
                    const active = value <= current;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setInlineCustomerFormData((prev) => ({
                            ...prev,
                            rating:
                              prev.rating === String(value) ? '0' : String(value),
                          }))
                        }
                        className="p-0.5"
                        aria-label={`Set rating ${value}`}
                      >
                        <Star
                          className={`w-5 h-5 ${active ? 'text-amber-400 fill-amber-400' : 'text-[var(--text-4)]'
                            }`}
                        />
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() =>
                      setInlineCustomerFormData((prev) => ({ ...prev, rating: '0' }))
                    }
                    className="ml-2 text-xs font-medium text-[var(--text-4)] hover:text-[var(--text-2)]"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <Field label="Notes">
              {(control) => (
                <Textarea
                  {...control}
                  className="min-h-[96px]"
                  value={inlineCustomerFormData.notes}
                  onChange={(e) =>
                    setInlineCustomerFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Internal notes"
                />
              )}
            </Field>
          </section>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={inlineCustomerSaving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={inlineCustomerSaving}>
              <span className="inline-flex items-center gap-2">
                <Save className="w-4 h-4" />
                {inlineCustomerSaving ? 'Saving...' : 'Create Customer'}
              </span>
            </button>
          </div>
        </form>
      </FormPromptModal>
  );
}
