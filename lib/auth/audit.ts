import "server-only";
import { db } from "@/lib/db/client";
import { auditLog } from "@/lib/db/schema";
import type { Role } from "./permissions";

export type AuditAction =
  | "create"
  | "update"
  | "cancel"
  | "confirm"
  | "override"
  | "export"
  | "login";

/**
 * Nothing is ever hard-deleted (architecture §3). Every mutating server
 * action should call this after the write — cancel sets cancelled_at plus
 * a reason on the row itself, and this is the trail that makes the
 * reconciliation story credible.
 */
export async function writeAudit(params: {
  millId: string;
  actorId: string;
  actorRole: Role;
  action: AuditAction;
  entityTable: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  await db.insert(auditLog).values({
    millId: params.millId,
    actorId: params.actorId,
    actorRole: params.actorRole,
    action: params.action,
    entityTable: params.entityTable,
    entityId: params.entityId,
    before: params.before ?? null,
    after: params.after ?? null,
  });
}
