import type { Request, Response, NextFunction } from 'express';
import type { Permission } from '../permissions';

/**
 * Verifie que l'utilisateur authentifie possede au moins une des permissions
 * requises (via ses roles). A utiliser apres `authenticate`.
 */
export function requirePermission(...required: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentification requise.' });
      return;
    }
    const granted = req.user.permissions ?? [];
    const ok = required.some((p) => granted.includes(p));
    if (!ok) {
      res.status(403).json({
        error: "Acces refuse : permission insuffisante.",
        requiredPermissions: required,
      });
      return;
    }
    next();
  };
}
