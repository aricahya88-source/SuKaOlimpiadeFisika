import type { Role } from './api';

export function homeForRole(role: Role) {
  if (role === 'super_admin') return '/super-admin';
  if (role === 'teacher') return '/teacher';
  if (role === 'validator') return '/validator';
  return '/student';
}

export function roleLabel(role: Role) {
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'teacher') return 'Panitia';
  if (role === 'validator') return 'Validator';
  return 'Peserta';
}
