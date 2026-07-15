
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

/**
 * Restores the session via GET /auth/me (HttpOnly cookie on web).
 */
export default function AuthBootstrap() {
  const loadUser = useAuthStore((s) => s.loadUser);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  return null;
}
