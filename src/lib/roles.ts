import type { AppRole } from '@/types/database';

export const STAFF_ROLES: AppRole[] = ['admin', 'authorising_officer', 'hr'];

export function isStaff(role?: AppRole | null): boolean {
  return !!role && STAFF_ROLES.includes(role);
}

export function isWorker(role?: AppRole | null): boolean {
  return role === 'worker';
}
