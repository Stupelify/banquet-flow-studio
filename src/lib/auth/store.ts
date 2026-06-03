/**
 * Cosmetic auth store — users, roles, current session — persisted locally.
 * Structured so a real API can replace `login()` / `logout()` / CRUD without
 * touching component code.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { PRESET_ROLES, ALL_PERMISSIONS, type Permission } from "./permissions";

export type Role = {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
};

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roleId: string;
  active: boolean;
  password: string; // cosmetic local-only
  createdAt: string;
};

type AuthState = {
  users: User[];
  roles: Role[];
  currentUserId: string | null;
};

type AuthActions = {
  login: (email: string, password: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
  loginAsDemo: () => void;
  createUser: (u: Omit<User, "id" | "createdAt">) => User;
  updateUser: (id: string, patch: Partial<User>) => void;
  deleteUser: (id: string) => void;
  resetPassword: (id: string, newPassword: string) => void;
  createRole: (r: Omit<Role, "id">) => Role;
  updateRole: (id: string, patch: Partial<Role>) => void;
  deleteRole: (id: string) => void;
};

const seedUsers: User[] = [
  { id: "user-admin",   name: "Suresh Iyer",   email: "admin@bika.in",     roleId: "role-admin",     active: true, password: "admin123",   createdAt: new Date().toISOString() },
  { id: "user-manager", name: "Anita Rao",     email: "manager@bika.in",   roleId: "role-manager",   active: true, password: "manager123", createdAt: new Date().toISOString() },
  { id: "user-booking", name: "Vikram Mehta",  email: "booking@bika.in",   roleId: "role-booking",   active: true, password: "booking123", createdAt: new Date().toISOString() },
  { id: "user-recep",   name: "Priya Singh",   email: "reception@bika.in", roleId: "role-reception", active: true, password: "recep123",   createdAt: new Date().toISOString() },
  { id: "user-acct",    name: "Rajan Kumar",   email: "accounts@bika.in",  roleId: "role-accounts",  active: true, password: "acct123",    createdAt: new Date().toISOString() },
];

const initial: AuthState = {
  users: seedUsers,
  roles: PRESET_ROLES.map((r) => ({ ...r })),
  currentUserId: null,
};

const rid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...initial,

      login: (email, password) => {
        const u = get().users.find((x) => x.email.toLowerCase() === email.toLowerCase().trim());
        if (!u) return { ok: false, error: "No user with that email." };
        if (!u.active) return { ok: false, error: "This account is disabled." };
        if (u.password !== password) return { ok: false, error: "Incorrect password." };
        set({ currentUserId: u.id });
        return { ok: true };
      },

      loginAsDemo: () => set({ currentUserId: "user-admin" }),

      logout: () => set({ currentUserId: null }),

      createUser: (u) => {
        const next: User = { ...u, id: rid("user"), createdAt: new Date().toISOString() };
        set((s) => ({ users: [next, ...s.users] }));
        return next;
      },
      updateUser: (id, patch) => set((s) => ({
        users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
      })),
      deleteUser: (id) => set((s) => ({
        users: s.users.filter((u) => u.id !== id),
        currentUserId: s.currentUserId === id ? null : s.currentUserId,
      })),
      resetPassword: (id, newPassword) => set((s) => ({
        users: s.users.map((u) => (u.id === id ? { ...u, password: newPassword } : u)),
      })),

      createRole: (r) => {
        const next: Role = { ...r, id: rid("role") };
        set((s) => ({ roles: [...s.roles, next] }));
        return next;
      },
      updateRole: (id, patch) => set((s) => ({
        roles: s.roles.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      })),
      deleteRole: (id) => set((s) => ({
        roles: s.roles.filter((r) => r.id !== id),
        users: s.users.map((u) => (u.roleId === id ? { ...u, roleId: "role-viewer" } : u)),
      })),
    }),
    {
      name: "bika-auth-store-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);

/* ─────────────────────────────── hooks ─────────────────────────────── */

export function useCurrentUser(): User | null {
  const id = useAuthStore((s) => s.currentUserId);
  const users = useAuthStore((s) => s.users);
  return id ? users.find((u) => u.id === id) ?? null : null;
}

export function useRoleOf(userId: string | null | undefined): Role | null {
  const roles = useAuthStore((s) => s.roles);
  const users = useAuthStore((s) => s.users);
  if (!userId) return null;
  const u = users.find((x) => x.id === userId);
  if (!u) return null;
  return roles.find((r) => r.id === u.roleId) ?? null;
}

export function useCan(perm: Permission | Permission[]): boolean {
  const user = useCurrentUser();
  const role = useRoleOf(user?.id);
  if (!role) return false;
  const need = Array.isArray(perm) ? perm : [perm];
  // For a list, "can" means user holds at least ONE listed permission.
  return need.some((p) => role.permissions.includes(p));
}

export function useAllCan(perms: Permission[]): boolean {
  const user = useCurrentUser();
  const role = useRoleOf(user?.id);
  if (!role) return false;
  return perms.every((p) => role.permissions.includes(p));
}

export const ALL_PERMISSION_KEYS: Permission[] = ALL_PERMISSIONS.map((p) => p.key);
