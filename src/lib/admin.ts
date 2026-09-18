export type AdminActorRole = "admin" | "super";
export type TargetUserRole = "student" | "teacher" | "admin" | "super";
export type AssignableRole = "student" | "teacher" | "admin";

/** Admin manages non-admins (students + teachers); super manages everyone except other supers (README §5.1). */
export function canManageUser(actorRole: AdminActorRole, targetRole: TargetUserRole): boolean {
  if (actorRole === "super") return targetRole !== "super";
  return targetRole === "student" || targetRole === "teacher";
}

/**
 * Only super reassigns roles, and never to/from the super flag (prevents lockout).
 * Teacher is invite-only: granting it is a super action, like admin promotion.
 */
export function canAssignRole(
  actorRole: AdminActorRole,
  targetRole: TargetUserRole,
  nextRole: string,
): nextRole is AssignableRole {
  if (actorRole !== "super") return false;
  if (targetRole === "super") return false;
  return nextRole === "student" || nextRole === "admin" || nextRole === "teacher";
}