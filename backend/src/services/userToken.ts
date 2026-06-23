import { prisma } from '../prisma';
import type { AccessTokenPayload } from '../utils/auth';

/**
 * Construit le payload du token d'acces pour un utilisateur :
 * agrege les permissions de tous ses roles.
 */
export async function buildTokenPayload(userId: string): Promise<AccessTokenPayload | null> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null, isActive: true },
    include: { roles: { include: { role: true } } },
  });
  if (!user) return null;

  const permissionSet = new Set<string>();
  const roleNames: string[] = [];
  for (const ur of user.roles) {
    roleNames.push(ur.role.name);
    try {
      const perms = JSON.parse(ur.role.permissions) as string[];
      perms.forEach((p) => permissionSet.add(p));
    } catch {
      // permissions mal formees : ignorees
    }
  }

  return {
    sub: user.id,
    matricule: user.matricule,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    permissions: [...permissionSet],
    roles: roleNames,
  };
}
