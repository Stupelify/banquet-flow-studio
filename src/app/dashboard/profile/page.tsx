
import { FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import Button from '@/components/ui/Button';

/** Mirrors the backend rule: min 8 chars and contains both letters and numbers. */
function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include both letters and numbers';
  }
  return null;
}

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationError = validatePassword(newPassword);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    try {
      setSaving(true);
      await api.changePassword({ currentPassword, newPassword });
      toast.success('Password changed. Other devices have been signed out.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="page-title">My Profile</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">
          {user?.name ? `${user.name} · ` : ''}
          {user?.email}
        </p>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary-600" />
          <h2 className="text-lg font-semibold text-[var(--text-1)]">Change my password</h2>
        </div>
        <form className="space-y-3" onSubmit={submit}>
          <div>
            <label className="label">Current password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                className="input pr-9"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-4)]"
                onClick={() => setShowCurrent((v) => !v)}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">New password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                className="input pr-9"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-4)]"
                onClick={() => setShowNew((v) => !v)}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-[var(--text-4)] mt-1">
              At least 8 characters, including letters and numbers.
            </p>
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input
              type="password"
              className="input"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" loading={saving}>
              {saving ? 'Saving...' : 'Change password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
