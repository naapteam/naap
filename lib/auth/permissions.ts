// Permission matrix per architecture doc §9. Enforced in server actions,
// not just UI — v1 only issues owner/manager accounts, but the other role
// values already exist in app_user.role and must resolve sensibly.

export type Role =
  | "owner"
  | "manager"
  | "accounts"
  | "gate"
  | "operator"
  | "loader"
  | "auditor"
  | "support";

export type Resource =
  | "intake"
  | "cutPlan"
  | "stock"
  | "despatch"
  | "reports"
  | "rates"
  | "masters"
  | "cancelClosedRecord"
  | "compliance"
  | "otherMills";

export type Action = "read" | "create" | "update" | "cancel" | "export";

type Capability = "full" | "read" | "create" | "limited" | "ownShift" | "none";

type Bucket = "owner" | "manager" | "others";

function bucketOf(role: Role): Bucket {
  if (role === "owner") return "owner";
  if (role === "manager") return "manager";
  return "others";
}

const MATRIX: Record<Resource, Record<Bucket, Capability>> = {
  intake: { owner: "full", manager: "full", others: "create" },
  cutPlan: { owner: "full", manager: "full", others: "read" },
  stock: { owner: "full", manager: "full", others: "read" },
  despatch: { owner: "full", manager: "full", others: "create" },
  // "all except rates" for manager is enforced by the separate `rates`
  // resource always being none for manager — reports itself stays full.
  reports: { owner: "full", manager: "full", others: "ownShift" },
  rates: { owner: "full", manager: "none", others: "none" },
  masters: { owner: "full", manager: "limited", others: "none" },
  cancelClosedRecord: { owner: "full", manager: "none", others: "none" },
  compliance: { owner: "full", manager: "full", others: "read" },
  otherMills: { owner: "full", manager: "none", others: "none" },
};

export function capabilityFor(role: Role, resource: Resource): Capability {
  return MATRIX[resource][bucketOf(role)];
}

/**
 * Whether `role` may perform `action` on `resource`.
 *
 * "limited" (masters, for non-owners) and "ownShift" (reports, for other
 * roles) are coarse allow for `read`; the caller must apply the finer
 * scoping itself (which masters sub-tabs, which shift's rows) — see each
 * screen's server actions as they're built.
 */
export function can(role: Role, resource: Resource, action: Action): boolean {
  const cap = capabilityFor(role, resource);
  switch (cap) {
    case "full":
      return true;
    case "none":
      return false;
    case "read":
      return action === "read";
    case "create":
      return action === "read" || action === "create";
    case "limited":
    case "ownShift":
      return action === "read";
  }
}

/** Org-level users (app_user.mill_id IS NULL) see every mill in their org —
 * the mill switcher only ever renders for them (UI spec §5). */
export function canAccessOtherMills(user: {
  role: Role;
  millId: string | null;
}): boolean {
  return user.role === "owner" && user.millId === null;
}
