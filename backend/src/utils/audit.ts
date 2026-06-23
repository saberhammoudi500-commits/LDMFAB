import type { Request } from 'express';
import { prisma } from '../prisma';

export interface AuditActor {
  id: string;
  label: string; // matricule + nom
}

interface AuditParams {
  actor?: AuditActor | null;
  action: string; // CREATE | UPDATE | DELETE | LOGIN | LOGIN_FAILED | LOGOUT | SIGN | EXPORT | IMPORT
  entity: string;
  entityId?: string | null;
  reason?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
}

function serialize(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Ecrit une entree dans la piste d'audit (immuable).
 * N'echoue jamais l'operation metier : les erreurs sont seulement journalisees.
 */
export async function recordAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.actor?.id ?? null,
        userLabel: params.actor?.label ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        reason: params.reason ?? null,
        oldValue: serialize(params.oldValue),
        newValue: serialize(params.newValue),
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[audit] echec d'ecriture:", err);
  }
}

export function clientIp(req: Request): string | null {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  return req.ip ?? req.socket?.remoteAddress ?? null;
}
