export const ROLE_STUDENT = "student";
export const ROLE_INSTRUCTOR = "instructor";
export const ROLE_INSTITUTION_ADMIN = "institution_admin";
export const ROLE_CONTENT_MANAGER = "content_manager";
export const ROLE_SUBSCRIPTION_MANAGER = "subscription_manager";
export const ROLE_SUPER_ADMIN = "super_admin";

const ROLE_HIERARCHY: Record<string, string[]> = {
  [ROLE_STUDENT]: [],
  [ROLE_INSTRUCTOR]: [ROLE_STUDENT],
  [ROLE_INSTITUTION_ADMIN]: [ROLE_STUDENT],
  [ROLE_CONTENT_MANAGER]: [ROLE_INSTRUCTOR, ROLE_STUDENT],
  [ROLE_SUBSCRIPTION_MANAGER]: [ROLE_INSTITUTION_ADMIN, ROLE_STUDENT],
  [ROLE_SUPER_ADMIN]: [
    ROLE_SUBSCRIPTION_MANAGER,
    ROLE_CONTENT_MANAGER,
    ROLE_INSTITUTION_ADMIN,
    ROLE_INSTRUCTOR,
    ROLE_STUDENT,
  ],
};

export const ADMIN_ROLE_OPTIONS = [
  ROLE_STUDENT,
  ROLE_INSTRUCTOR,
  ROLE_INSTITUTION_ADMIN,
  ROLE_CONTENT_MANAGER,
  ROLE_SUBSCRIPTION_MANAGER,
  ROLE_SUPER_ADMIN,
];

export function roleLabel(role: string) {
  return role.replace(/_/g, " ");
}

export function expandRoles(roles: string[]) {
  const expanded = new Set<string>();

  const visit = (role: string) => {
    if (!role || expanded.has(role)) return;
    expanded.add(role);
    (ROLE_HIERARCHY[role] || []).forEach(visit);
  };

  roles.forEach(visit);
  return expanded;
}

export function hasAnyRole(roles: string[], allowed: string[]) {
  const expanded = expandRoles(roles);
  return allowed.some((role) => expanded.has(role));
}
