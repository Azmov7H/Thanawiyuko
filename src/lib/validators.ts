import { z } from "zod";

export const GRADES = ["sec1", "sec2", "sec3"] as const;
export const TRACKS = ["general", "science", "math", "literary"] as const;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "البريد الإلكتروني مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export const notificationPreferencesSchema = z.object({
  email: z.boolean().optional(),
  push: z.boolean().optional(),
});

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "الاسم قصير جدًا")
    .max(60, "الاسم طويل جدًا"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("البريد الإلكتروني غير صالح")
    .max(160),
  password: z
    .string()
    .min(8, "كلمة المرور 8 أحرف على الأقل")
    .max(128, "كلمة المرور طويلة جدًا"),
  guardianConsent: z
    .boolean()
    .refine((v) => v === true, { message: "مطلوب إقرار ولي الأمر للمتابعة" }),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "كلمة المرور مطلوبة").max(128),
});

export const onboardingPatchSchema = z
  .object({
    grade: z.enum(GRADES).optional(),
    track: z.enum(TRACKS).nullable().optional(),
    dailyMinutes: z.number().int().min(10).max(240).optional(),
    targetExamDate: z.string().date("التاريخ غير صالح").nullable().optional(),
    step: z.number().int().min(1).max(5).optional(),
    done: z.boolean().optional(),
  })
  .refine(
    (v) => v.grade !== "sec3" || v.track !== undefined || v.done !== true,
    { message: "طلاب الصف الثالث يجب أن يختاروا الشعبة", path: ["track"] },
  );

export type RegisterInput = z.infer<typeof registerSchema>;
export type OnboardingPatch = z.infer<typeof onboardingPatchSchema>;
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
