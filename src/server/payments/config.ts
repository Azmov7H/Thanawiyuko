/** Payment configuration (MVP — Paymob first, abstraction ready for others). */

export type PlanId = "monthly" | "semester" | "annual";

export type PlanConfig = {
  id: PlanId;
  nameAr: string;
  nameEn: string;
  priceEGP: number; // integer pounds
  durationDays: number;
  popular?: boolean;
  features: string[];
};

export const PLANS: Record<PlanId, PlanConfig> = {
  monthly: {
    id: "monthly",
    nameAr: "شهري",
    nameEn: "Monthly",
    priceEGP: 129,
    durationDays: 30,
    features: ["تدريب غير محدود", "امتحانات تجريبية كاملة", "خطة يومية متكيفة", "مساعد ذكي 100 رسالة/يوم", "مكتبة أخطاء كاملة"],
  },
  semester: {
    id: "semester",
    nameAr: "نصف سنوي (فصل دراسي)",
    nameEn: "Semester",
    priceEGP: 449,
    durationDays: 150,
    popular: true,
    features: ["كل ميزات الشهري", "خصم 15%", "أولوية الدعم", "تقارير أسبوعية للولي"],
  },
  annual: {
    id: "annual",
    nameAr: "سنوي (السنة كاملة)",
    nameEn: "Annual",
    priceEGP: 799,
    durationDays: 365,
    features: ["كل ميزات الفصل الدراسي", "خصم 35% — أفضل قيمة", "وصول مبكر للميزات الجديدة", "دعم مخصص", "تقرير شهري مفصل للولي"],
  },
};

export const GRACE_DAYS = 3; // after renewal failure, keep Plus for 3 days
export const CURRENCY = "EGP";

export function getPlan(id: string): PlanConfig | undefined {
  return PLANS[id as PlanId];
}

export function listPlans(): PlanConfig[] {
  return Object.values(PLANS);
}