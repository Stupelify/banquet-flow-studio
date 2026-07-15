
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { confirmDialog } from '@/components/ConfirmDialog';
import {
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Save,
  Search,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from '@/lib/router-compat';
import EmptyState from '@/components/EmptyState';
import FormPromptModal from '@/components/FormPromptModal';
import { TableSkeleton } from '@/components/Skeletons';
import Toolbar from '@/components/Toolbar';
import Switch from '@/components/ui/Switch';

interface UserRow {
  id: string;
  name?: string | null;
  email: string;
  createdAt?: string;
  isActive?: boolean;
  hasAllVenueAccess?: boolean;
  lastLoginAt?: string | null;
  userRoles?: Array<{ role: { id: string; name: string } }>;
}

interface BanquetOption {
  id: string;
  name: string;
  location?: string;
}

interface RoleRow {
  id: string;
  name: string;
  description?: string | null;
  permissions?: Array<{ permission: { id: string; name: string } }>;
  _count?: { userRoles: number };
}

interface PermissionRow {
  id: string;
  name: string;
  description?: string | null;
}

interface CurrentUser {
  id: string;
  email: string;
  name?: string | null;
  roles: string[];
  permissions: string[];
}

interface PermissionGroup {
  key: string;
  label: string;
  permissions: PermissionRow[];
}

type PermOverride = 'default' | 'grant' | 'deny';

const NO_USERS: UserRow[] = [];
const NO_ROLES: RoleRow[] = [];
const NO_PERMISSIONS: PermissionRow[] = [];
const NO_BANQUETS: BanquetOption[] = [];

const ACTION_TOKENS = new Set([
  'add',
  'view',
  'edit',
  'delete',
  'manage',
  'assign',
  'send',
  'download',
]);

const ACTION_ORDER = ['assign', 'manage', 'add', 'view', 'edit', 'delete', 'send', 'download'];
const KEEP_MANAGE_ACTION_SUBJECTS = new Set(['permission', 'payment']);

const SUBJECT_ALIASES: Record<string, string> = {
  users: 'user', user: 'user', customers: 'customer', customer: 'customer',
  roles: 'role', role: 'role', permissions: 'permission', permission: 'permission',
  items: 'item', item: 'item', itemtypes: 'itemtype', itemtype: 'itemtype',
  halls: 'hall', hall: 'hall', banquets: 'banquet', banquet: 'banquet',
  bookings: 'booking', booking: 'booking', enquiries: 'enquiry', enquiry: 'enquiry',
  templatemenus: 'templatemenu', templatemenu: 'templatemenu',
  calendars: 'calendar', calendar: 'calendar', dashboards: 'dashboard', dashboard: 'dashboard',
  reports: 'report', report: 'report', audit: 'audit',
};

const SUBJECT_LABELS: Record<string, string> = {
  user: 'Users', customer: 'Customers', role: 'Roles', permission: 'Permissions',
  item: 'Items', itemtype: 'Item Types', hall: 'Halls', banquet: 'Banquets',
  booking: 'Bookings', enquiry: 'Enquiries', templatemenu: 'Template Menus',
  calendar: 'Calendar', dashboard: 'Dashboard', report: 'Reports', payment: 'Payments',
  menu: 'Menu', audit: 'Audit Logs',
};

const SUBJECT_ORDER = [
  'dashboard', 'report', 'calendar', 'booking', 'enquiry', 'payment', 'customer',
  'hall', 'banquet', 'item', 'itemtype', 'templatemenu', 'menu',
  'user', 'role', 'permission', 'audit',
];

function normalizeSubject(subject: string): string {
  const key = subject.toLowerCase();
  return SUBJECT_ALIASES[key] || key;
}

function actionOrder(action: string): number {
  const index = ACTION_ORDER.indexOf(action.toLowerCase());
  return index === -1 ? ACTION_ORDER.length : index;
}

function formatAction(action: string): string {
  const clean = action.trim();
  if (!clean) return 'Manage';
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

function parsePermissionName(name: string): { action: string; subject: string } {
  const parts = name.split('_').filter(Boolean);
  if (parts.length === 0) return { action: 'manage', subject: 'general' };
  if (ACTION_TOKENS.has(parts[0])) {
    return { action: parts[0], subject: parts.slice(1).join('_') || 'general' };
  }
  if (ACTION_TOKENS.has(parts[parts.length - 1])) {
    return { action: parts[parts.length - 1], subject: parts.slice(0, -1).join('_') || 'general' };
  }
  return { action: parts[0], subject: parts.slice(1).join('_') || 'general' };
}

function formatPermissionLabel(name: string): string {
  const { action, subject } = parsePermissionName(name);
  const normalizedSubject = normalizeSubject(subject);
  const subjectLabel = SUBJECT_LABELS[normalizedSubject] || normalizedSubject.replace(/_/g, ' ');
  const singularSubject = subjectLabel.endsWith('s') ? subjectLabel.slice(0, -1) : subjectLabel;
  return `${formatAction(action)} ${singularSubject.toLowerCase()}`;
}

function isPermissionEffectiveOn(
  permissionId: string,
  inheritedIds: Set<string>,
  overrides: Record<string, PermOverride>
): boolean {
  const override = overrides[permissionId] || 'default';
  return override === 'grant' || (override === 'default' && inheritedIds.has(permissionId));
}

function permissionOverrideForEffective(
  permissionId: string,
  nextOn: boolean,
  inheritedIds: Set<string>
): PermOverride {
  const inherited = inheritedIds.has(permissionId);
  if (nextOn) return inherited ? 'default' : 'grant';
  return inherited ? 'deny' : 'default';
}

function arraysMatchAsSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
}

/** Mirrors the backend rule: min 8 chars and contains both letters and numbers. */
function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include both letters and numbers';
  }
  return null;
}

const initialUserForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  roleId: '',
  banquetAccess: [] as string[],
};

const initialResetPasswordForm = { newPassword: '', confirmPassword: '' };
const initialRoleForm = { name: '', description: '' };

type SettingsSection = 'users' | 'roles';

function isSettingsSection(value: string | null): value is SettingsSection {
  return value === 'users' || value === 'roles';
}

function SettingsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // React Query owns fetching; saves/deletes invalidate instead of flashing
  // the whole settings page back to a loading state.
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ['settings-admin-data'],
    queryFn: async () => {
      const meRes = await api.getCurrentUser();
      const me = (meRes.data?.data?.user || null) as CurrentUser | null;

      const permissionSet = new Set(me?.permissions || []);
      const canReadUsers =
        permissionSet.has('view_user') ||
        permissionSet.has('manage_users') ||
        permissionSet.has('assign_role');
      const canReadRoles =
        permissionSet.has('view_role') ||
        permissionSet.has('manage_roles') ||
        permissionSet.has('assign_role') ||
        permissionSet.has('add_user') ||
        permissionSet.has('manage_permission');
      const canReadPermissions =
        permissionSet.has('view_permission') ||
        permissionSet.has('manage_permission') ||
        permissionSet.has('manage_roles') ||
        permissionSet.has('add_role');

      const [usersRes, rolesRes, permissionsRes, banquetsRes] = await Promise.all([
        canReadUsers ? api.getUsers({ page: 1, limit: 5000 }) : Promise.resolve(null),
        canReadRoles ? api.getRoles() : Promise.resolve(null),
        canReadPermissions ? api.getPermissions() : Promise.resolve(null),
        api.getBanquets({ page: 1, limit: 500 }),
      ]);

      return {
        currentUser: me,
        users: (usersRes?.data?.data?.users || []) as UserRow[],
        roles: (rolesRes?.data?.data?.roles || []) as RoleRow[],
        permissions: (permissionsRes?.data?.data?.permissions || []) as PermissionRow[],
        banquets: (banquetsRes?.data?.data?.banquets || []) as BanquetOption[],
      };
    },
    placeholderData: keepPreviousData,
  });
  const users = settingsQuery.data?.users ?? NO_USERS;
  const roles = settingsQuery.data?.roles ?? NO_ROLES;
  const permissions = settingsQuery.data?.permissions ?? NO_PERMISSIONS;
  const banquets = settingsQuery.data?.banquets ?? NO_BANQUETS;
  const currentUser = settingsQuery.data?.currentUser ?? null;
  const loading = settingsQuery.isLoading;

  useEffect(() => {
    if (settingsQuery.isError) toast.error('Failed to load settings data');
  }, [settingsQuery.isError]);

  // Mutation call sites still `await loadData()` — now a cache invalidation.
  const loadData = async () => {
    await queryClient.invalidateQueries({ queryKey: ['settings-admin-data'] });
  };

  const [userSearch, setUserSearch] = useState('');

  // Create-user modal
  const [showUserPrompt, setShowUserPrompt] = useState(false);
  const [userForm, setUserForm] = useState(initialUserForm);
  const [savingUser, setSavingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // Permission selection for the create-user modal. Seeded from the chosen
  // role, then freely editable before the account is created.
  const [newUserPermIds, setNewUserPermIds] = useState<string[]>([]);

  // Reset-password modal
  const [resetPasswordUser, setResetPasswordUser] = useState<UserRow | null>(null);
  const [resetPasswordForm, setResetPasswordForm] = useState(initialResetPasswordForm);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [savingUserPasswordReset, setSavingUserPasswordReset] = useState(false);

  const [savingUserStatus, setSavingUserStatus] = useState(false);

  // Edit-user modal (roles + venue + per-user permissions + profile)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRoleIds, setEditRoleIds] = useState<string[]>([]);
  const [editAllVenues, setEditAllVenues] = useState(false);
  const [editBanquetIds, setEditBanquetIds] = useState<string[]>([]);
  const [permOverride, setPermOverride] = useState<Record<string, PermOverride>>({});
  const [savingEditUser, setSavingEditUser] = useState(false);

  // Role modal (create or edit a role + its permissions)
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRow | null>(null);
  const [roleForm, setRoleForm] = useState(initialRoleForm);
  const [rolePermIds, setRolePermIds] = useState<string[]>([]);
  const [savingRole, setSavingRole] = useState(false);

  const [activeSection, setActiveSection] = useState<SettingsSection>('users');
  const sectionParam = searchParams.get('section');

  const currentPermissionSet = useMemo(
    () => new Set(currentUser?.permissions || []),
    [currentUser]
  );

  const canViewUsers =
    currentPermissionSet.has('view_user') || currentPermissionSet.has('manage_users');
  const canAddUsers =
    currentPermissionSet.has('add_user') || currentPermissionSet.has('manage_users');
  const canDeleteUsers =
    currentPermissionSet.has('delete_user') || currentPermissionSet.has('manage_users');
  const canManageUsers = currentPermissionSet.has('manage_users');
  const canAssignRoles =
    currentPermissionSet.has('assign_role') || currentPermissionSet.has('manage_roles');
  const canManageRolePermissions =
    currentPermissionSet.has('manage_permission') || currentPermissionSet.has('manage_roles');
  const canViewRoles =
    currentPermissionSet.has('view_role') || currentPermissionSet.has('manage_roles');
  const canAddRoles =
    currentPermissionSet.has('add_role') || currentPermissionSet.has('manage_roles');
  const canEditRoles =
    currentPermissionSet.has('edit_role') ||
    currentPermissionSet.has('manage_roles') ||
    canManageRolePermissions;
  const canDeleteRoles =
    currentPermissionSet.has('delete_role') || currentPermissionSet.has('manage_roles');

  const canAccessUsersSection = canViewUsers || canAddUsers || canDeleteUsers || canManageUsers;
  const canAccessRolesSection = canViewRoles || canAddRoles || canEditRoles || canDeleteRoles;
  // Whether the per-user permission editor (grant/deny) is available.
  const canEditUserPermissions = canManageRolePermissions;

  const availableSections = useMemo<SettingsSection[]>(() => {
    const list: SettingsSection[] = [];
    if (canAccessUsersSection) list.push('users');
    if (canAccessRolesSection) list.push('roles');
    return list;
  }, [canAccessUsersSection, canAccessRolesSection]);

  useEffect(() => {
    if (availableSections.length === 0) return;
    const requested = isSettingsSection(sectionParam) ? sectionParam : null;
    const next =
      requested && availableSections.includes(requested) ? requested : availableSections[0];
    if (activeSection !== next) setActiveSection(next);
    if (sectionParam !== next) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('section', next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [activeSection, availableSections, pathname, router, searchParams, sectionParam]);

  const navigateToSection = (section: SettingsSection) => {
    if (!availableSections.includes(section)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', section);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      `${user.name || ''} ${user.email}`.toLowerCase().includes(query)
    );
  }, [userSearch, users]);

  // Shared between the desktop table row and the mobile card layout.
  const renderUserActions = (user: UserRow, isSelf: boolean) => (
    <>
      {(canManageUsers || canAssignRoles) && (
        <button
          className="px-2 py-1 text-xs rounded-lg border border-[var(--border)] text-[var(--text-3)] hover:bg-[var(--surface-2)]"
          onClick={() => openEditUser(user)}
          title="Edit roles, venue access and permissions"
        >
          Edit
        </button>
      )}
      {canManageUsers && !isSelf && (
        <button
          className="p-2 text-[var(--text-4)] hover:text-amber-700 dark:hover:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg"
          onClick={() => openResetPasswordModal(user)}
          title="Reset password"
        >
          <KeyRound className="w-4 h-4" />
        </button>
      )}
      {canDeleteUsers && !isSelf && (
        <button
          className="p-2 text-[var(--text-4)] hover:text-red-700 dark:hover:text-red-200 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
          onClick={() => removeUser(user)}
          title="Delete user (only when the user has no history)"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </>
  );

  const renderUserStatusToggle = (user: UserRow, isSelf: boolean) => {
    const active = user.isActive !== false;
    const label = `${user.name || user.email} ${active ? 'enabled' : 'disabled'}`;

    if (canManageUsers && !isSelf) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-4)]">{active ? 'On' : 'Off'}</span>
          <Switch
            label={label}
            checked={active}
            disabled={savingUserStatus}
            onChange={(next) => {
              if (next === active) return;
              void toggleUserStatus(user);
            }}
          />
        </div>
      );
    }

    return (
      <span
        className={`text-xs font-medium ${active ? 'text-emerald-600' : 'text-[var(--text-4)]'}`}
      >
        {active ? 'On' : 'Off'}
      </span>
    );
  };

  const permissionGroups = useMemo<PermissionGroup[]>(() => {
    const groups = new Map<string, PermissionGroup>();
    const subjectsWithGranularActions = new Set<string>();

    permissions.forEach((permission) => {
      const { action, subject } = parsePermissionName(permission.name);
      if (action.toLowerCase() !== 'manage') {
        subjectsWithGranularActions.add(normalizeSubject(subject));
      }
    });

    permissions.forEach((permission) => {
      const { action, subject } = parsePermissionName(permission.name);
      const key = normalizeSubject(subject);
      if (
        action.toLowerCase() === 'manage' &&
        subjectsWithGranularActions.has(key) &&
        !KEEP_MANAGE_ACTION_SUBJECTS.has(key)
      ) {
        return;
      }
      const label = SUBJECT_LABELS[key] || key.replace(/_/g, ' ').toUpperCase();
      const group = groups.get(key) || { key, label, permissions: [] };
      group.permissions.push(permission);
      groups.set(key, group);
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        permissions: [...group.permissions].sort((a, b) => {
          const orderDelta =
            actionOrder(parsePermissionName(a.name).action) -
            actionOrder(parsePermissionName(b.name).action);
          return orderDelta !== 0 ? orderDelta : a.name.localeCompare(b.name);
        }),
      }))
      .sort((a, b) => {
        const indexA = SUBJECT_ORDER.indexOf(a.key);
        const indexB = SUBJECT_ORDER.indexOf(b.key);
        const safeA = indexA === -1 ? SUBJECT_ORDER.length : indexA;
        const safeB = indexB === -1 ? SUBJECT_ORDER.length : indexB;
        return safeA !== safeB ? safeA - safeB : a.label.localeCompare(b.label);
      });
  }, [permissions]);

  // Permission ids inherited from the roles currently selected in the edit modal.
  const inheritedPermissionIds = useMemo(() => {
    const set = new Set<string>();
    roles.forEach((role) => {
      if (editRoleIds.includes(role.id)) {
        role.permissions?.forEach((rp) => set.add(rp.permission.id));
      }
    });
    return set;
  }, [roles, editRoleIds]);

  // When the create-user modal is open, seed its permission selection from the
  // currently chosen role (importing the role's permissions). Changing the role
  // re-imports; the admin can then tick/untick before creating the account.
  useEffect(() => {
    if (!showUserPrompt) return;
    const role = roles.find((r) => r.id === userForm.roleId);
    setNewUserPermIds(role?.permissions?.map((rp) => rp.permission.id) || []);
  }, [showUserPrompt, userForm.roleId, roles]);

  // ── Create user ──────────────────────────────────────────────────────────
  const createUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canAddUsers) {
      toast.error('You do not have permission to create users');
      return;
    }
    if (!userForm.name.trim() || !userForm.email.trim() || !userForm.password.trim()) {
      toast.error('Name, email and password are required');
      return;
    }
    const passwordError = validatePassword(userForm.password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    if (userForm.password !== userForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      setSavingUser(true);
      const created = await api.createUser({
        name: userForm.name.trim(),
        email: userForm.email.trim(),
        password: userForm.password,
        roleId: userForm.roleId || undefined,
      });
      const newUserId = created?.data?.data?.user?.id;
      if (newUserId && userForm.banquetAccess.length > 0) {
        await api.setUserBanquets(newUserId, userForm.banquetAccess);
      }
      // Translate the customized permission selection into per-user overrides
      // relative to the chosen role: ticked-but-not-in-role => grant,
      // in-role-but-unticked => deny.
      if (newUserId && canEditUserPermissions) {
        const roleInherited = new Set(
          roles.find((r) => r.id === userForm.roleId)?.permissions?.map(
            (rp) => rp.permission.id
          ) || []
        );
        const selected = new Set(newUserPermIds);
        const grants = newUserPermIds.filter((id) => !roleInherited.has(id));
        const denies = Array.from(roleInherited).filter((id) => !selected.has(id));
        if (grants.length > 0 || denies.length > 0) {
          await api.setUserDirectPermissions(newUserId, { grants, denies });
        }
      }
      toast.success('User created');
      setShowUserPrompt(false);
      setUserForm(initialUserForm);
      setNewUserPermIds([]);
      setShowPassword(false);
      setShowConfirmPassword(false);
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to create user');
    } finally {
      setSavingUser(false);
    }
  };

  // ── Reset password ───────────────────────────────────────────────────────
  const openResetPasswordModal = (user: UserRow) => {
    if (!canManageUsers) {
      toast.error('You do not have permission to reset passwords');
      return;
    }
    setResetPasswordUser(user);
    setResetPasswordForm(initialResetPasswordForm);
    setShowResetPassword(false);
    setShowResetConfirmPassword(false);
  };

  const submitResetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!resetPasswordUser || !canManageUsers) return;
    const newPassword = resetPasswordForm.newPassword;
    const validationError = validatePassword(newPassword);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (newPassword !== resetPasswordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      setSavingUserPasswordReset(true);
      await api.resetUserPassword(resetPasswordUser.id, { newPassword });
      toast.success(
        `Password reset for ${resetPasswordUser.email}. They have been signed out of all devices.`
      );
      setResetPasswordUser(null);
      setResetPasswordForm(initialResetPasswordForm);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to reset password');
    } finally {
      setSavingUserPasswordReset(false);
    }
  };

  // ── Enable / disable ─────────────────────────────────────────────────────
  const toggleUserStatus = async (user: UserRow) => {
    if (!canManageUsers) {
      toast.error('You do not have permission to change user status');
      return;
    }
    if (user.id === currentUser?.id) {
      toast.error('You cannot disable your own account');
      return;
    }
    const nextActive = !user.isActive;
    if (
      !nextActive &&
      !(await confirmDialog({
        title: `Disable ${user.email}?`,
        description:
          'They will be signed out of all devices and cannot log in until re-enabled.',
        confirmLabel: 'Disable',
        tone: 'danger',
      }))
    ) {
      return;
    }
    try {
      setSavingUserStatus(true);
      await api.setUserStatus(user.id, { isActive: nextActive });
      toast.success(nextActive ? 'User enabled' : 'User disabled');
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to update user status');
    } finally {
      setSavingUserStatus(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const removeUser = async (user: UserRow) => {
    if (!canDeleteUsers) {
      toast.error('You do not have permission to delete users');
      return;
    }
    if (user.id === currentUser?.id) {
      toast.error('You cannot delete your own account');
      return;
    }
    if (
      !(await confirmDialog({
        title: `Delete ${user.email}?`,
        description: 'This cannot be undone.',
        confirmLabel: 'Delete',
        tone: 'danger',
      }))
    )
      return;
    try {
      await api.deleteUser(user.id);
      toast.success('User deleted');
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete user');
    }
  };

  // ── Edit user (roles + venue + permissions + profile) ──────────────────────
  const openEditUser = async (user: UserRow) => {
    if (!canManageUsers && !canAssignRoles) {
      toast.error('You do not have permission to edit users');
      return;
    }
    setEditingUser(user);
    setEditName(user.name || '');
    setEditEmail(user.email);
    setEditRoleIds(user.userRoles?.map((ur) => ur.role.id) || []);
    setEditAllVenues(Boolean(user.hasAllVenueAccess));
    setEditBanquetIds([]);
    setPermOverride({});

    try {
      const [banquetRes, permRes] = await Promise.all([
        api.getUserBanquets(user.id),
        canEditUserPermissions
          ? api.getUserDirectPermissions(user.id)
          : Promise.resolve(null),
      ]);
      setEditBanquetIds(banquetRes.data?.data?.banquetIds || []);
      const grants: string[] = permRes?.data?.data?.grants || [];
      const denies: string[] = permRes?.data?.data?.denies || [];
      const overrides: Record<string, PermOverride> = {};
      grants.forEach((id) => {
        overrides[id] = 'grant';
      });
      denies.forEach((id) => {
        overrides[id] = 'deny';
      });
      setPermOverride(overrides);
    } catch {
      // Non-fatal: modal still opens with role/profile editing.
    }
  };

  const closeEditUser = () => {
    setEditingUser(null);
  };

  const setPermissionOverride = (permissionId: string, value: PermOverride) => {
    setPermOverride((prev) => {
      const next = { ...prev };
      if (value === 'default') delete next[permissionId];
      else next[permissionId] = value;
      return next;
    });
  };

  const toggleEditUserPermission = (permissionId: string, nextOn: boolean) => {
    setPermissionOverride(
      permissionId,
      permissionOverrideForEffective(permissionId, nextOn, inheritedPermissionIds)
    );
  };

  const setEditUserGroupPermissions = (group: PermissionGroup, nextOn: boolean) => {
    setPermOverride((prev) => {
      const next = { ...prev };
      group.permissions.forEach((permission) => {
        const value = permissionOverrideForEffective(
          permission.id,
          nextOn,
          inheritedPermissionIds
        );
        if (value === 'default') delete next[permission.id];
        else next[permission.id] = value;
      });
      return next;
    });
  };

  const setNewUserPermission = (permissionId: string, nextOn: boolean) => {
    setNewUserPermIds((prev) =>
      nextOn
        ? prev.includes(permissionId)
          ? prev
          : [...prev, permissionId]
        : prev.filter((id) => id !== permissionId)
    );
  };

  const setRolePermission = (permissionId: string, nextOn: boolean) => {
    setRolePermIds((prev) =>
      nextOn
        ? prev.includes(permissionId)
          ? prev
          : [...prev, permissionId]
        : prev.filter((id) => id !== permissionId)
    );
  };

  const setRoleGroupPermissions = (group: PermissionGroup, nextOn: boolean) => {
    const ids = group.permissions.map((p) => p.id);
    setRolePermIds((prev) =>
      nextOn
        ? Array.from(new Set([...prev, ...ids]))
        : prev.filter((id) => !ids.includes(id))
    );
  };

  const setNewUserGroupPermissions = (group: PermissionGroup, nextOn: boolean) => {
    const ids = group.permissions.map((p) => p.id);
    setNewUserPermIds((prev) =>
      nextOn
        ? Array.from(new Set([...prev, ...ids]))
        : prev.filter((id) => !ids.includes(id))
    );
  };

  const submitEditUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editName.trim() || !editEmail.trim()) {
      toast.error('Name and email are required');
      return;
    }
    const userId = editingUser.id;
    const originalRoleIds = editingUser.userRoles?.map((ur) => ur.role.id) || [];
    try {
      setSavingEditUser(true);

      if (canManageUsers) {
        await api.updateUser(userId, {
          name: editName.trim(),
          email: editEmail.trim(),
        });
      }

      if (canAssignRoles && !arraysMatchAsSet(editRoleIds, originalRoleIds)) {
        await api.updateUserRoles({ userId, roleIds: editRoleIds });
      }

      if (canManageUsers) {
        await api.setUserAllVenues(userId, editAllVenues);
        if (!editAllVenues) {
          await api.setUserBanquets(userId, editBanquetIds);
        }
      }

      if (canEditUserPermissions) {
        const grants = Object.entries(permOverride)
          .filter(([, v]) => v === 'grant')
          .map(([id]) => id);
        const denies = Object.entries(permOverride)
          .filter(([, v]) => v === 'deny')
          .map(([id]) => id);
        await api.setUserDirectPermissions(userId, { grants, denies });
      }

      toast.success('User updated');
      setEditingUser(null);
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to update user');
    } finally {
      setSavingEditUser(false);
    }
  };

  // ── Roles ──────────────────────────────────────────────────────────────────
  const openCreateRole = () => {
    if (!canAddRoles) {
      toast.error('You do not have permission to create roles');
      return;
    }
    setEditingRole(null);
    setRoleForm(initialRoleForm);
    setRolePermIds([]);
    setRoleModalOpen(true);
  };

  const openEditRole = (role: RoleRow) => {
    if (!canEditRoles) {
      toast.error('You do not have permission to edit roles');
      return;
    }
    setEditingRole(role);
    setRoleForm({ name: role.name, description: role.description || '' });
    setRolePermIds(role.permissions?.map((rp) => rp.permission.id) || []);
    setRoleModalOpen(true);
  };

  const submitRole = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!roleForm.name.trim()) {
      toast.error('Role name is required');
      return;
    }
    const isAdminRole = editingRole?.name.toLowerCase() === 'admin';
    try {
      setSavingRole(true);
      let roleId = editingRole?.id;
      if (editingRole) {
        await api.updateRole(editingRole.id, {
          name: roleForm.name.trim(),
          description: roleForm.description.trim() || undefined,
        });
      } else {
        const response = await api.createRole({
          name: roleForm.name.trim(),
          description: roleForm.description.trim() || undefined,
        });
        roleId = response.data?.data?.role?.id;
      }
      // Admin always has every permission; never let the editor strip it.
      if (roleId && canManageRolePermissions && !isAdminRole) {
        await api.updateRolePermissions({ roleId, permissionIds: rolePermIds });
      }
      toast.success(editingRole ? 'Role updated' : 'Role created');
      setRoleModalOpen(false);
      setEditingRole(null);
      setRoleForm(initialRoleForm);
      setRolePermIds([]);
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to save role');
    } finally {
      setSavingRole(false);
    }
  };

  const removeRole = async (role: RoleRow) => {
    if (!canDeleteRoles) {
      toast.error('You do not have permission to delete roles');
      return;
    }
    if (role.name.toLowerCase() === 'admin') {
      toast.error('The Admin role cannot be deleted');
      return;
    }
    const assignedUsers = role._count?.userRoles || 0;
    if (
      !(await confirmDialog({
        title: 'Delete this role?',
        description:
          assignedUsers > 0
            ? `This role is assigned to ${assignedUsers} user${assignedUsers === 1 ? '' : 's'}. Deleting it will remove their access.`
            : 'This cannot be undone.',
        confirmLabel: 'Delete',
        tone: 'danger',
      }))
    )
      return;
    try {
      await api.deleteRole(role.id);
      toast.success('Role deleted');
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete role');
    }
  };

  const isAdminRoleModal = editingRole?.name.toLowerCase() === 'admin';

  return (
    <div className="ops-route ops-catalog-route">
      <Toolbar
        title="User Management"
        stats={[
          { label: 'Users', value: users.length },
          { label: 'Roles', value: roles.length },
        ]}
      />

      {/* Reset password modal */}
      {resetPasswordUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="card w-full max-w-md space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary-600" />
              <h2 className="text-lg font-semibold text-[var(--text-1)]">Reset password</h2>
            </div>
            <p className="text-sm text-[var(--text-3)]">
              Set a new password for{' '}
              <span className="font-medium">{resetPasswordUser.email}</span>. They will be signed
              out of all devices and must sign in with the new password.
            </p>
            <form className="space-y-3" onSubmit={submitResetPassword}>
              <div>
                <label className="label">New password</label>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    className="input pr-9"
                    value={resetPasswordForm.newPassword}
                    onChange={(e) =>
                      setResetPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                    }
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-4)]"
                    onClick={() => setShowResetPassword((v) => !v)}
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-[var(--text-4)] mt-1">
                  At least 8 characters, including letters and numbers.
                </p>
              </div>
              <div>
                <label className="label">Confirm new password</label>
                <div className="relative">
                  <input
                    type={showResetConfirmPassword ? 'text' : 'password'}
                    className="input pr-9"
                    value={resetPasswordForm.confirmPassword}
                    onChange={(e) =>
                      setResetPasswordForm((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-4)]"
                    onClick={() => setShowResetConfirmPassword((v) => !v)}
                  >
                    {showResetConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setResetPasswordUser(null)}
                  disabled={savingUserPasswordReset}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingUserPasswordReset}>
                  {savingUserPasswordReset ? 'Resetting...' : 'Reset password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit-user modal */}
      <FormPromptModal
        open={!!editingUser}
        title={editingUser ? `Edit ${editingUser.email}` : 'Edit user'}
        onClose={closeEditUser}
        widthClass="max-w-4xl"
      >
        {editingUser && (
          <form className="space-y-5" onSubmit={submitEditUser}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Name</label>
                <input
                  className="input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={!canManageUsers}
                  required
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  disabled={!canManageUsers}
                  required
                />
              </div>
            </div>

            {/* Roles */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[var(--text-1)]">Roles</p>
              {roles.length === 0 ? (
                <p className="text-sm text-[var(--text-4)]">No roles defined yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {roles.map((role) => (
                    <label
                      key={role.id}
                      className="flex items-center gap-2 text-sm text-[var(--text-2)]"
                    >
                      <input
                        type="checkbox"
                        checked={editRoleIds.includes(role.id)}
                        onChange={() =>
                          setEditRoleIds((prev) =>
                            prev.includes(role.id)
                              ? prev.filter((id) => id !== role.id)
                              : [...prev, role.id]
                          )
                        }
                        disabled={!canAssignRoles}
                      />
                      {role.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Venue access */}
            {banquets.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[var(--text-3)]" />
                  <p className="text-sm font-semibold text-[var(--text-1)]">Venue access</p>
                </div>
                <label className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-3">
                  <span className="text-sm text-[var(--text-2)]">
                    <span className="font-medium">All venues</span>
                    <span className="block text-xs text-[var(--text-4)]">
                      Access to every banquet (overrides the selection below).
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={editAllVenues}
                    onChange={(e) => setEditAllVenues(e.target.checked)}
                    disabled={!canManageUsers}
                  />
                </label>
                <div
                  className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${
                    editAllVenues ? 'opacity-40 pointer-events-none' : ''
                  }`}
                >
                  {banquets.map((b) => (
                    <label
                      key={b.id}
                      className="flex items-center gap-2 text-sm text-[var(--text-2)] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={editBanquetIds.includes(b.id)}
                        onChange={() =>
                          setEditBanquetIds((prev) =>
                            prev.includes(b.id)
                              ? prev.filter((id) => id !== b.id)
                              : [...prev, b.id]
                          )
                        }
                        disabled={!canManageUsers}
                      />
                      {b.name}
                      {b.location ? (
                        <span className="text-xs text-[var(--text-4)]">({b.location})</span>
                      ) : null}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-4)]">
                  {editAllVenues
                    ? 'User can access every banquet.'
                    : editBanquetIds.length === 0
                      ? 'No venue access — enable All venues or pick banquets.'
                      : `Restricted to ${editBanquetIds.length} banquet(s).`}
                </p>
              </div>
            )}

            {/* Per-user permissions */}
            {canEditUserPermissions && permissionGroups.length > 0 && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-1)]">Permissions</p>
                  <p className="text-xs text-[var(--text-4)]">
                    Toggle each permission on or off. Changing a role above updates the defaults;
                    overrides stay until you switch them back.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {permissionGroups.map((group) => (
                    <PermissionGroupToggles
                      key={group.key}
                      group={group}
                      isOn={(id) =>
                        isPermissionEffectiveOn(id, inheritedPermissionIds, permOverride)
                      }
                      onToggle={toggleEditUserPermission}
                      onToggleAll={(next) => setEditUserGroupPermissions(group, next)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeEditUser}
                disabled={savingEditUser}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={savingEditUser}>
                <span className="inline-flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {savingEditUser ? 'Saving...' : 'Save changes'}
                </span>
              </button>
            </div>
          </form>
        )}
      </FormPromptModal>

      {/* Create-user modal */}
      <FormPromptModal
        open={showUserPrompt}
        title="Create User"
        onClose={() => setShowUserPrompt(false)}
        widthClass="max-w-3xl"
      >
        <form className="space-y-4" onSubmit={createUser}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Full name</label>
              <input
                className="input"
                autoComplete="off"
                value={userForm.name}
                onChange={(e) => setUserForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                autoComplete="off"
                value={userForm.email}
                onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input"
                autoComplete="new-password"
                value={userForm.password}
                onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                required
              />
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-2 text-xs text-[var(--text-2)]"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPassword ? 'Hide password' : 'Show password'}
              </button>
              <p className="mt-1 text-xs text-[var(--text-4)]">
                At least 8 characters, including letters and numbers.
              </p>
            </div>
            <div>
              <label className="label">Confirm password</label>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="input"
                autoComplete="new-password"
                value={userForm.confirmPassword}
                onChange={(e) =>
                  setUserForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                }
                required
              />
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-2 text-xs text-[var(--text-2)]"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                {showConfirmPassword ? 'Hide confirmation' : 'Show confirmation'}
              </button>
            </div>
            <div>
              <label className="label">Role</label>
              <select
                className="input"
                value={userForm.roleId}
                onChange={(e) => setUserForm((prev) => ({ ...prev, roleId: e.target.value }))}
                disabled={!canViewRoles || roles.length === 0}
              >
                <option value="">Select role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {banquets.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[var(--text-3)]" />
                <label className="label m-0">Venue access</label>
                <span className="text-xs text-[var(--text-4)]">
                  {userForm.banquetAccess.length === 0
                    ? '— all banquets'
                    : `— ${userForm.banquetAccess.length} selected`}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl border border-[var(--border-2)] p-3 bg-slate-50 dark:bg-slate-500/10">
                {banquets.map((b) => (
                  <label
                    key={b.id}
                    className="flex items-center gap-2 text-sm text-[var(--text-2)] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={userForm.banquetAccess.includes(b.id)}
                      onChange={() =>
                        setUserForm((prev) => ({
                          ...prev,
                          banquetAccess: prev.banquetAccess.includes(b.id)
                            ? prev.banquetAccess.filter((id) => id !== b.id)
                            : [...prev.banquetAccess, b.id],
                        }))
                      }
                    />
                    {b.name}
                    {b.location ? (
                      <span className="text-[var(--text-4)] text-xs">({b.location})</span>
                    ) : null}
                  </label>
                ))}
              </div>
              <p className="text-xs text-[var(--text-4)]">
                Leave all unchecked = access to all banquets.
              </p>
            </div>
          )}

          {canEditUserPermissions && permissionGroups.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[var(--text-3)]" />
                <label className="label m-0">Permissions</label>
              </div>
              <p className="text-xs text-[var(--text-4)]">
                {userForm.roleId
                  ? 'Defaults come from the selected role. Use the toggles to turn permissions on or off for this user.'
                  : 'Select a role to load its default permissions, then adjust with the toggles.'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {permissionGroups.map((group) => (
                  <PermissionGroupToggles
                    key={group.key}
                    group={group}
                    isOn={(id) => newUserPermIds.includes(id)}
                    onToggle={setNewUserPermission}
                    onToggleAll={(next) => setNewUserGroupPermissions(group, next)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowUserPrompt(false)}
            >
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={savingUser}>
              <span className="inline-flex items-center gap-2">
                <Save className="w-4 h-4" />
                {savingUser ? 'Saving...' : 'Create User'}
              </span>
            </button>
          </div>
        </form>
      </FormPromptModal>

      {/* Role modal (create / edit) */}
      <FormPromptModal
        open={roleModalOpen}
        title={editingRole ? `Edit role: ${editingRole.name}` : 'Create role'}
        onClose={() => setRoleModalOpen(false)}
        widthClass="max-w-4xl"
      >
        <form className="space-y-4" onSubmit={submitRole}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Role name</label>
              <input
                className="input"
                value={roleForm.name}
                onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))}
                disabled={isAdminRoleModal}
                required
              />
            </div>
            <div>
              <label className="label">Description</label>
              <input
                className="input"
                value={roleForm.description}
                onChange={(e) =>
                  setRoleForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-[var(--text-1)]">Permissions</p>
            {isAdminRoleModal ? (
              <p className="text-sm text-[var(--text-4)]">
                The Admin role always has every permission and cannot be changed.
              </p>
            ) : !canManageRolePermissions ? (
              <p className="text-sm text-[var(--text-4)]">
                You can edit the role name, but not its permissions.
              </p>
            ) : permissionGroups.length === 0 ? (
              <p className="text-sm text-[var(--text-4)]">No permissions available.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {permissionGroups.map((group) => (
                  <PermissionGroupToggles
                    key={group.key}
                    group={group}
                    isOn={(id) => rolePermIds.includes(id)}
                    onToggle={setRolePermission}
                    onToggleAll={(next) => setRoleGroupPermissions(group, next)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setRoleModalOpen(false)}
            >
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={savingRole}>
              <span className="inline-flex items-center gap-2">
                <Save className="w-4 h-4" />
                {savingRole ? 'Saving...' : editingRole ? 'Save role' : 'Create role'}
              </span>
            </button>
          </div>
        </form>
      </FormPromptModal>

      {/* Tabs */}
      <div className="ops-section-tabs" role="tablist" aria-label="Account sections">
          {canAccessUsersSection && (
            <button
              type="button"
              role="tab"
              aria-selected={activeSection === 'users'}
              onClick={() => navigateToSection('users')}
              className={`ops-section-tab ${activeSection === 'users' ? 'active' : ''}`}
            >
              Users
            </button>
          )}
          {canAccessRolesSection && (
            <button
              type="button"
              role="tab"
              aria-selected={activeSection === 'roles'}
              onClick={() => navigateToSection('roles')}
              className={`ops-section-tab ${activeSection === 'roles' ? 'active' : ''}`}
            >
              Roles
            </button>
          )}
      </div>

      {availableSections.length === 0 && (
        <div className="card py-12 text-center">
          <p className="text-sm text-[var(--text-2)]">
            You do not have permission to manage users or roles.
          </p>
        </div>
      )}

      {/* Users tab */}
      {activeSection === 'users' && canAccessUsersSection && (
        <div className="card">
          <div className="page-head mb-4">
            <h2 className="text-lg font-semibold text-[var(--text-1)]">Users</h2>
            {canAddUsers && (
              <button
                type="button"
                className="btn btn-primary inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                onClick={() => setShowUserPrompt(true)}
              >
                <Users className="w-4 h-4" />
                Add user
              </button>
            )}
          </div>

          {canViewUsers && (
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-4)]" />
              <input
                className="input pl-9"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users by name or email"
              />
            </div>
          )}

          {loading ? (
            <TableSkeleton rows={5} />
          ) : !canViewUsers ? (
            <p className="text-sm text-[var(--text-4)]">
              You can create or delete users, but cannot view user records.
            </p>
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon={Users}
              title={userSearch.trim() ? 'No users match this search' : 'No users yet'}
              description={
                userSearch.trim()
                  ? 'Try a different name or email.'
                  : 'Create the first staff account to start assigning access.'
              }
              action={
                userSearch.trim()
                  ? { label: 'Clear search', onClick: () => setUserSearch('') }
                  : undefined
              }
            />
          ) : (
            <>
              {/* Desktop: full table. Mobile (<860px): stacked cards — no horizontal scroll. */}
              <div className="hidden min-[860px]:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-4)] border-b border-[var(--border)]">
                      <th className="py-2 pr-3 font-semibold">User</th>
                      <th className="py-2 pr-3 font-semibold">Roles</th>
                      <th className="py-2 pr-3 font-semibold">Venues</th>
                      <th className="py-2 pr-3 font-semibold">Enabled</th>
                      <th className="py-2 pr-3 font-semibold">Last login</th>
                      <th className="py-2 pr-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => {
                      const isSelf = user.id === currentUser?.id;
                      const roleNames = (user.userRoles || []).map((ur) => ur.role.name).join(', ');
                      return (
                        <tr
                          key={user.id}
                          className="border-b border-[var(--border)] last:border-0 align-top"
                        >
                          <td className="py-3 pr-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[var(--text-1)]">
                                {user.name || 'Unnamed user'}
                              </span>
                              {isSelf && (
                                <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-700">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[var(--text-4)]">{user.email}</div>
                          </td>
                          <td className="py-3 pr-3 text-[var(--text-3)]">
                            {roleNames || <span className="text-[var(--text-4)]">No roles</span>}
                          </td>
                          <td className="py-3 pr-3 text-[var(--text-3)]">
                            {user.hasAllVenueAccess ? 'All venues' : 'Restricted'}
                          </td>
                          <td className="py-3 pr-3">{renderUserStatusToggle(user, isSelf)}</td>
                          <td className="py-3 pr-3 text-xs text-[var(--text-4)]">
                            {user.lastLoginAt
                              ? new Date(user.lastLoginAt).toLocaleString()
                              : 'Never'}
                          </td>
                          <td className="py-3 pr-3">
                            <div className="flex items-center justify-end gap-1">
                              {renderUserActions(user, isSelf)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="min-[860px]:hidden space-y-3">
                {filteredUsers.map((user) => {
                  const isSelf = user.id === currentUser?.id;
                  const roleNames = (user.userRoles || []).map((ur) => ur.role.name).join(', ');
                  return (
                    <div
                      key={user.id}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[var(--text-1)] truncate">
                              {user.name || 'Unnamed user'}
                            </span>
                            {isSelf && (
                              <span className="shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-700">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[var(--text-4)] break-all">{user.email}</div>
                        </div>
                        <div className="shrink-0">{renderUserStatusToggle(user, isSelf)}</div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-3)]">
                        <span>{roleNames || 'No roles'}</span>
                        <span>{user.hasAllVenueAccess ? 'All venues' : 'Restricted'}</span>
                        <span className="text-[var(--text-4)]">
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleString()
                            : 'Never logged in'}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-[var(--border)] pt-2">
                        {renderUserActions(user, isSelf)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Roles tab */}
      {activeSection === 'roles' && canAccessRolesSection && (
        <div className="card">
          <div className="page-head mb-4">
            <h2 className="text-lg font-semibold text-[var(--text-1)]">Roles</h2>
            {canAddRoles && (
              <button
                type="button"
                className="btn btn-primary inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                onClick={openCreateRole}
              >
                <Shield className="w-4 h-4" />
                Add role
              </button>
            )}
          </div>
          {loading ? (
            <TableSkeleton rows={5} />
          ) : !canViewRoles ? (
            <p className="text-sm text-[var(--text-4)]">
              You can create or delete roles, but cannot view role records.
            </p>
          ) : roles.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="No roles yet"
              description="Create the first role before assigning access to staff."
            />
          ) : (
            <div className="space-y-3">
              {roles.map((role) => {
                const isAdmin = role.name.toLowerCase() === 'admin';
                return (
                  <div key={role.id} className="border border-[var(--border)] rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-1)]">{role.name}</p>
                        {role.description ? (
                          <p className="text-xs text-[var(--text-3)] mt-1">{role.description}</p>
                        ) : null}
                        <p className="text-xs text-[var(--text-4)] mt-1">
                          {isAdmin
                            ? 'All permissions'
                            : `${role.permissions?.length || 0} permissions`}{' '}
                          • {role._count?.userRoles || 0} users
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {canEditRoles && (
                          <button
                            className="px-2 py-1 text-xs rounded-lg border border-[var(--border)] text-[var(--text-3)] hover:bg-[var(--surface-2)]"
                            onClick={() => openEditRole(role)}
                            title="Edit role and its permissions"
                          >
                            Edit
                          </button>
                        )}
                        {canDeleteRoles && !isAdmin && (
                          <button
                            className="p-2 text-[var(--text-4)] hover:text-red-700 dark:hover:text-red-200 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
                            onClick={() => removeRole(role)}
                            title="Delete role"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PermissionToggleRow({
  label,
  title,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  title?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3" title={title}>
      <span className="text-sm text-[var(--text-2)]">{label}</span>
      <Switch label={label} checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function PermissionGroupToggles({
  group,
  isOn,
  onToggle,
  onToggleAll,
  disabled,
}: {
  group: PermissionGroup;
  isOn: (permissionId: string) => boolean;
  onToggle: (permissionId: string, next: boolean) => void;
  onToggleAll: (next: boolean) => void;
  disabled?: boolean;
}) {
  const allOn = group.permissions.every((permission) => isOn(permission.id));

  return (
    <div className="rounded-xl border border-[var(--border)] p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--text-1)]">{group.label}</p>
        <div className="flex items-center gap-2 text-xs text-[var(--text-3)]">
          <span>All</span>
          <Switch
            label={`All ${group.label} permissions`}
            checked={allOn}
            onChange={onToggleAll}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="space-y-2">
        {group.permissions.map((permission) => {
          const label = formatPermissionLabel(permission.name);
          return (
            <PermissionToggleRow
              key={permission.id}
              label={label}
              title={permission.name}
              checked={isOn(permission.id)}
              onChange={(next) => onToggle(permission.id, next)}
              disabled={disabled}
            />
          );
        })}
      </div>
    </div>
  );
}

// Next required Suspense around useSearchParams; TanStack does not suspend.
export default function SettingsPage() {
  return <SettingsPageContent />;
}
