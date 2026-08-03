export const PARTNER_EQUIVALENT_ROLES = ["partner", "kadis", "sekdis"] as const;

export type PartnerEquivalentRole = (typeof PARTNER_EQUIVALENT_ROLES)[number];

export const isPartnerRole = (
  role: string | null | undefined,
): role is PartnerEquivalentRole =>
  PARTNER_EQUIVALENT_ROLES.includes(role as PartnerEquivalentRole);

export const canManageData = (role: string | null | undefined) =>
  role === "admin" || isPartnerRole(role);

export const roleLabel = (role: string | null | undefined) => {
  if (role === "kadis") return "Kadis";
  if (role === "sekdis") return "Sekdis";
  if (role === "partner") return "Partner";
  if (role === "admin") return "Admin";
  return "User";
};
