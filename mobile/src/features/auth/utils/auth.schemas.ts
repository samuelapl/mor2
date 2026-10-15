import { z } from 'zod';

// ─── Shared building blocks ─────────────────────────────────────────────────

const emailField = z
  .string()
  .min(1, 'required')
  .email('auth.errors.invalidEmail');

const passwordField = z
  .string()
  .min(1, 'common.required')
  .min(8, 'auth.errors.passwordLength')
  .regex(/[A-Za-z]/, 'auth.errors.passwordMix')
  .regex(/[0-9]/, 'auth.errors.passwordMix');

// ─── Login ──────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'common.required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// ─── Register ───────────────────────────────────────────────────────────────

export const registerSchema = z
  .object({
    firstName: z.string().min(1, 'common.required'),
    lastName: z.string().min(1, 'common.required'),
    email: emailField,
    phone: z.string().min(1, 'common.required'),
    tin: z.string().optional(),
    password: passwordField,
    confirm: z.string().min(1, 'common.required'),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirm'],
        message: 'auth.errors.passwordMismatch',
      });
    }
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

// ─── Forgot password ────────────────────────────────────────────────────────

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

// ─── Reset / first-login password ───────────────────────────────────────────

export const resetPasswordSchema = z
  .object({
    password: passwordField,
    confirm: z.string().min(1, 'common.required'),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirm'],
        message: 'auth.errors.passwordMismatch',
      });
    }
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

// ─── Change password ────────────────────────────────────────────────────────

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, 'common.required'),
    next: passwordField,
    confirm: z.string().min(1, 'common.required'),
  })
  .superRefine((data, ctx) => {
    if (data.next !== data.confirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirm'],
        message: 'auth.errors.passwordMismatch',
      });
    }
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

// ─── Edit profile ────────────────────────────────────────────────────────────

export const editProfileSchema = z.object({
  firstName: z.string().min(1, 'common.required'),
  lastName: z.string().min(1, 'common.required'),
  phone: z.string().optional(),
  tin: z.string().optional(),
});

export type EditProfileFormValues = z.infer<typeof editProfileSchema>;

