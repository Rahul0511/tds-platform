import { Role } from '../models';

/** Roles from least to most rights; every role includes the ones before it. */
export const ROLES: Role[] = ['viewer', 'editor', 'admin'];

export const ROLE_INFO: Record<Role, { label: string; badge: string; description: string; rights: string[] }> = {
  viewer: {
    label: 'Viewer',
    badge: 'badge-neutral',
    description: 'Reads data and creates TDS documents.',
    rights: ['View products and history', 'Preview, print and download TDS'],
  },
  editor: {
    label: 'Editor',
    badge: 'badge-blue',
    description: 'Maintains the TDS data.',
    rights: ['Everything a viewer can do', 'Create, edit and delete products', 'Edit lookups, text blocks and header rules'],
  },
  admin: {
    label: 'Admin',
    badge: 'badge-violet',
    description: 'Manages users and settings.',
    rights: ['Everything an editor can do', 'Add users, change roles, reset passwords', 'Document settings and security log'],
  },
};

export const roleAtLeast = (role: Role | undefined, min: Role) => !!role && ROLES.indexOf(role) >= ROLES.indexOf(min);
