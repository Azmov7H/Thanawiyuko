export type PlanRow = {
  key: string;
  nameAr: string;
  nameEn: string;
  priceEGP: number;
  durationDays: number;
  popular?: boolean;
  features: string[];
};

export type PlanView = PlanRow & { id: string };

export function toPlanView(row: PlanRow): PlanView {
  return {
    id: row.key,
    key: row.key,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    priceEGP: row.priceEGP,
    durationDays: row.durationDays,
    popular: row.popular ?? false,
    features: row.features,
  };
}

export function isPlanKey(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 40;
}
