export const permissionGroups = {
  "admin.read": "Membuka control center",
  "providers.read": "Melihat status provider",
  "providers.write": "Mengelola provider dan kredensial",
  "models.write": "Mengelola model dan routing",
  "features.write": "Mengelola fitur dan batas penggunaan",
  "monitoring.read": "Melihat monitoring dan log sistem",
  "users.read": "Melihat pengguna",
  "users.write": "Mengelola akun dan sesi",
  "roles.write": "Mengubah role pengguna",
  "settings.write": "Mengubah pengaturan sistem",
} as const;
export type Permission = keyof typeof permissionGroups;
export const roles = ["super_admin", "admin", "support", "user"] as const;
export type Role = (typeof roles)[number];
export const rolePermissions: Record<Role, Permission[]> = {
  super_admin: Object.keys(permissionGroups) as Permission[],
  admin: [
    "admin.read",
    "providers.read",
    "providers.write",
    "models.write",
    "features.write",
    "monitoring.read",
    "users.read",
    "users.write",
    "settings.write",
  ],
  support: ["admin.read", "monitoring.read", "users.read"],
  user: [],
};
export function permissionsFor(role: string): Permission[] {
  return rolePermissions[role as Role] || [];
}
export function hasPermission(role: string, permission: Permission) {
  return permissionsFor(role).includes(permission);
}
