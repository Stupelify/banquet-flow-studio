
import { Save, Star } from 'lucide-react';
import FormPromptModal from '@/components/FormPromptModal';
import Combobox from '@/components/Combobox';
import { TableSkeleton } from '@/components/Skeletons';
import Button from '@/components/ui/Button';
import { INDIA_STATES } from '@/lib/indiaData';
import {
  CASTE_OPTIONS,
  COUNTRY_DIAL_CODE_OPTIONS,
  COUNTRY_OPTIONS,
  PRIORITY_OPTIONS,
  digitsOnly,
  getDialCodeOption,
  getExpectedPhoneDigits,
  sanitizeNameInput,
} from '@/lib/customerFormOptions';
import type { CustomerFormApi } from '../_hooks/useCustomerForm';
import type { CustomerRow } from '../_lib/types';

export default function CustomerFormModal({
  form,
  useServer,
  referrerOptions,
}: {
  form: CustomerFormApi;
  useServer: boolean;
  /** Legacy (in-memory) referred-by options; ignored in server mode. */
  referrerOptions: CustomerRow[];
}) {
  const {
    showCreatePrompt,
    closeCreatePrompt,
    editingCustomerId,
    loadingFormData,
    saving,
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
    pinnedReferrer,
    referrerToOption,
    loadReferrersPage,
    handleSubmit,
  } = form;

  const primaryPhoneDigits = getExpectedPhoneDigits(formData.phoneCountryIso);
  const secondaryPhoneDigits = getExpectedPhoneDigits(formData.alterPhoneCountryIso);
  const whatsappPhoneDigits = getExpectedPhoneDigits(formData.whatsappCountryIso);

  return (
    <FormPromptModal
      open={showCreatePrompt}
      title={editingCustomerId ? 'Edit Customer' : 'Add Customer'}
      onClose={closeCreatePrompt}
      widthClass="max-w-6xl"
    >
      {loadingFormData ? (
        <div className="py-6">
          <TableSkeleton rows={5} />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-7" noValidate>
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-1)]">Personal Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4">
                <label className="label">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      name: sanitizeNameInput(e.target.value),
                    }))
                  }
                  className="input"
                  placeholder="Full name"
                  required
                />
              </div>
              <div className="md:col-span-4">
                <label className="label">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-[180px,1fr] gap-2">
                  <Combobox
                    value={formData.phoneCountryIso}
                    onChange={(nextIso) => {
                      const digits = getExpectedPhoneDigits(nextIso);
                      setPhoneFieldErrors((prev) => ({ ...prev, phone: undefined }));
                      setFormData((prev) => ({
                        ...prev,
                        phoneCountryIso: nextIso,
                        phone: prev.phone.slice(0, digits),
                        whatsappCountryIso: isWhatsappDifferent
                          ? prev.whatsappCountryIso
                          : nextIso,
                      }));
                    }}
                    options={COUNTRY_DIAL_CODE_OPTIONS.map((option) => ({
                      value: option.iso2,
                      label: `${option.flag} ${option.country} (${option.code})`,
                    }))}
                  />
                  <input
                    value={formData.phone}
                    onChange={(e) => {
                      setPhoneFieldErrors((prev) => ({ ...prev, phone: undefined }));
                      setFormData((prev) => ({
                        ...prev,
                        phone: digitsOnly(e.target.value).slice(0, primaryPhoneDigits),
                      }));
                    }}
                    className="input"
                    placeholder={`${primaryPhoneDigits}-digit number`}
                    inputMode="numeric"
                    minLength={primaryPhoneDigits}
                    maxLength={primaryPhoneDigits}
                    required
                  />
                </div>
                {phoneFieldErrors.phone && (
                  <p className="mt-1 text-xs text-red-600">{phoneFieldErrors.phone}</p>
                )}
                <p className="mt-1 text-xs text-[var(--text-4)]">
                  {getDialCodeOption(formData.phoneCountryIso).country} numbers must be{' '}
                  {primaryPhoneDigits} digits.
                </p>
              </div>
              <div className="md:col-span-4">
                <label className="label">2nd Phone No.</label>
                <div className="grid grid-cols-[180px,1fr] gap-2">
                  <Combobox
                    value={formData.alterPhoneCountryIso}
                    onChange={(nextIso) => {
                      const digits = getExpectedPhoneDigits(nextIso);
                      setPhoneFieldErrors((prev) => ({ ...prev, alterPhone: undefined }));
                      setFormData((prev) => ({
                        ...prev,
                        alterPhoneCountryIso: nextIso,
                        alterPhone: prev.alterPhone.slice(0, digits),
                      }));
                    }}
                    options={COUNTRY_DIAL_CODE_OPTIONS.map((option) => ({
                      value: option.iso2,
                      label: `${option.flag} ${option.country} (${option.code})`,
                    }))}
                  />
                  <input
                    value={formData.alterPhone}
                    onChange={(e) => {
                      setPhoneFieldErrors((prev) => ({ ...prev, alterPhone: undefined }));
                      setFormData((prev) => ({
                        ...prev,
                        alterPhone: digitsOnly(e.target.value).slice(0, secondaryPhoneDigits),
                      }));
                    }}
                    className="input"
                    placeholder={`${secondaryPhoneDigits}-digit number`}
                    inputMode="numeric"
                    maxLength={secondaryPhoneDigits}
                  />
                </div>
                {phoneFieldErrors.alterPhone && (
                  <p className="mt-1 text-xs text-red-600">{phoneFieldErrors.alterPhone}</p>
                )}
                <p className="mt-1 text-xs text-[var(--text-4)]">
                  Optional. If entered, it must be exactly {secondaryPhoneDigits} digits.
                </p>
              </div>
              <div className="md:col-span-4">
                <label className="label">Caste</label>
                <Combobox
                  value={formData.caste}
                  onChange={(val) =>
                    setFormData((prev) => ({ ...prev, caste: val }))
                  }
                  options={CASTE_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                  placeholder="None"
                />
              </div>
              <div className="md:col-span-4">
                <label className="label">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setEmailFieldError('');
                    setFormData((prev) => ({ ...prev, email: e.target.value }));
                  }}
                  className="input"
                  placeholder="name@example.com"
                />
                {emailFieldError && (
                  <p className="mt-1 text-xs text-red-600">{emailFieldError}</p>
                )}
              </div>
              <div className="md:col-span-4 flex items-end">
                <label className="inline-flex items-center gap-2 text-sm text-[var(--text-2)] pb-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[var(--border-2)] text-primary-600 focus:ring-primary-500"
                    checked={isWhatsappDifferent}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsWhatsappDifferent(checked);
                      if (!checked) {
                        setPhoneFieldErrors((prev) => ({
                          ...prev,
                          whatsappNumber: undefined,
                        }));
                        setFormData((prev) => ({
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
              {isWhatsappDifferent && (
                <div className="md:col-span-4">
                  <label className="label">
                    WhatsApp Number <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-[180px,1fr] gap-2">
                    <Combobox
                      value={formData.whatsappCountryIso}
                      onChange={(nextIso) => {
                        const digits = getExpectedPhoneDigits(nextIso);
                        setPhoneFieldErrors((prev) => ({
                          ...prev,
                          whatsappNumber: undefined,
                        }));
                        setFormData((prev) => ({
                          ...prev,
                          whatsappCountryIso: nextIso,
                          whatsappNumber: prev.whatsappNumber.slice(0, digits),
                        }));
                      }}
                      options={COUNTRY_DIAL_CODE_OPTIONS.map((option) => ({
                        value: option.iso2,
                        label: `${option.flag} ${option.country} (${option.code})`,
                      }))}
                    />
                    <input
                      value={formData.whatsappNumber}
                      onChange={(e) => {
                        setPhoneFieldErrors((prev) => ({
                          ...prev,
                          whatsappNumber: undefined,
                        }));
                        setFormData((prev) => ({
                          ...prev,
                          whatsappNumber: digitsOnly(e.target.value).slice(
                            0,
                            whatsappPhoneDigits
                          ),
                        }));
                      }}
                      className="input"
                      placeholder={`${whatsappPhoneDigits}-digit number`}
                      inputMode="numeric"
                      minLength={whatsappPhoneDigits}
                      maxLength={whatsappPhoneDigits}
                      required
                    />
                  </div>
                  {phoneFieldErrors.whatsappNumber && (
                    <p className="mt-1 text-xs text-red-600">
                      {phoneFieldErrors.whatsappNumber}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-[var(--text-4)]">
                    Must be exactly {whatsappPhoneDigits} digits.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-1)]">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4">
                <label className="label">Country</label>
                <Combobox
                  value={formData.country}
                  onChange={(val) =>
                    setFormData((prev) => ({ ...prev, country: val }))
                  }
                  options={COUNTRY_OPTIONS.map((country) => ({ value: country, label: country }))}
                  placeholder="Select country"
                />
              </div>
              <div className="md:col-span-4">
                <label className="label">PIN Code</label>
                <input
                  value={formData.pincode}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      pincode: digitsOnly(e.target.value),
                    }))
                  }
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
                {pincodeLookupError && (
                  <p className="mt-1 text-xs text-red-600">{pincodeLookupError}</p>
                )}
              </div>
              <div className="md:col-span-4">
                <label className="label">State</label>
                {formData.country.trim().toLowerCase() === 'india' ? (
                  <select
                    value={formData.state}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, state: e.target.value }))
                    }
                    className="input"
                  >
                    <option value="">Select state</option>
                    {INDIA_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={formData.state}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, state: e.target.value }))
                    }
                    className="input"
                    placeholder="State"
                  />
                )}
              </div>
              <div className="md:col-span-4">
                <label className="label">City</label>
                <input
                  value={formData.city}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, city: e.target.value }))
                  }
                  className="input"
                  placeholder="City"
                />
              </div>
              <div className="md:col-span-4">
                <label className="label">Street One</label>
                <input
                  value={formData.street1}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, street1: e.target.value }))
                  }
                  className="input"
                  placeholder="Street one"
                />
              </div>
              <div className="md:col-span-4">
                <label className="label">Street Two</label>
                <input
                  value={formData.street2}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, street2: e.target.value }))
                  }
                  className="input"
                  placeholder="Street two"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-1)]">Social Links</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div>
                <label className="label">Facebook</label>
                <input
                  value={formData.facebookProfile}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      facebookProfile: e.target.value,
                    }))
                  }
                  className="input"
                  placeholder="Facebook profile"
                />
              </div>
              <div>
                <label className="label">Instagram</label>
                <input
                  value={formData.instagramHandle}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      instagramHandle: e.target.value,
                    }))
                  }
                  className="input"
                  placeholder="Instagram handle"
                />
              </div>
              <div>
                <label className="label">Twitter</label>
                <input
                  value={formData.twitter}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, twitter: e.target.value }))
                  }
                  className="input"
                  placeholder="Twitter"
                />
              </div>
              <div>
                <label className="label">LinkedIn</label>
                <input
                  value={formData.linkedin}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, linkedin: e.target.value }))
                  }
                  className="input"
                  placeholder="LinkedIn"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-1)]">Other Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4">
                <label className="label">Referred By</label>
                <Combobox
                  value={formData.referredById}
                  onChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      referredById: val,
                    }))
                  }
                  options={(useServer
                    ? pinnedReferrer
                      ? [pinnedReferrer]
                      : []
                    : referrerOptions
                  ).map(referrerToOption)}
                  loadPage={useServer ? loadReferrersPage : undefined}
                  placeholder="Search name or phone"
                  searchPlaceholder="Name or phone number"
                />
              </div>
              <div className="md:col-span-4">
                <label className="label">Priority</label>
                <Combobox
                  value={formData.priority}
                  onChange={(val) =>
                    setFormData((prev) => ({ ...prev, priority: val }))
                  }
                  options={PRIORITY_OPTIONS}
                />
              </div>
              <div className="md:col-span-4">
                <label className="label">Rating</label>
                <div className="h-11 flex items-center gap-1 rounded-xl border border-[var(--border)] px-3">
                  {[1, 2, 3, 4, 5].map((value) => {
                    const current = Number(formData.rating || '0');
                    const active = value <= current;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            rating: prev.rating === String(value) ? '0' : String(value),
                          }))
                        }
                        className="p-0.5"
                        aria-label={`Set rating ${value}`}
                      >
                        <Star
                          className={`w-5 h-5 ${active ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
                            }`}
                        />
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, rating: '0' }))}
                    className="ml-2 text-xs font-medium text-[var(--text-4)] hover:text-[var(--text-2)]"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                className="input min-h-[96px]"
                placeholder="Internal notes"
              />
            </div>
          </section>

          <div className="form-actions">
            <Button
              type="button"
              onClick={closeCreatePrompt}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              icon={<Save className="w-4 h-4" />}
            >
              {saving
                ? 'Saving...'
                : editingCustomerId
                  ? 'Update Customer'
                  : 'Create Customer'}
            </Button>
          </div>
        </form>
      )}
    </FormPromptModal>
  );
}
