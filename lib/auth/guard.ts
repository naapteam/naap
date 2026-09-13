import "server-only";
import { getSession, type SessionPayload } from "./session";
import { can, type Action, type Resource, type Role } from "./permissions";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/** Every mutating server action starts with one of these two calls. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new AuthError("Not signed in.");
  return session;
}

export async function requireRole(...roles: Role[]): Promise<SessionPayload> {
  const session = await requireSession();
  if (!roles.includes(session.role)) {
    throw new AuthError("You don't have permission to do that.");
  }
  return session;
}

export async function requireCan(
  resource: Resource,
  action: Action,
): Promise<SessionPayload> {
  const session = await requireSession();
  if (!can(session.role, resource, action)) {
    throw new AuthError("You don't have permission to do that.");
  }
  return session;
}

/** For a mill-scoped read/write: confirms the session can see this mill at
 * all (org-level owner sees every mill; everyone else only their own). */
export async function requireMillAccess(
  millId: string,
): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.millId === millId) return session;
  if (session.role === "owner" && session.millId === null) return session;
  throw new AuthError("You don't have access to this mill.");
}
