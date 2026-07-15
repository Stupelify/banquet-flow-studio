export function hasAnyPermission(
  permissions: string[] | undefined,
  required: string[]
): boolean {
  if (!permissions || permissions.length === 0) return false;
  return required.some((permission) => permissions.includes(permission));
}
