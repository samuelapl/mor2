import { z } from 'zod';

// ─── Shared building blocks ─────────────────────────────────────────────────

const emailField = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

const passwordField = z
  .string()
  .min(1, 'Password is required')
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Za-z]/, 'Password must include at least one letter')
  .regex(/[0-9]/, 'Password must include at least one number');

// ─── Login ──────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// ─── Register ───────────────────────────────────────────────────────────────

export const registerSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: emailField,
    phone: z.string().min(1, 'Phone number is required'),
    tin: z.string().optional(),
    department: z.string().optional(),
    password: passwordField,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Confirm password must match',
      });
    }
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

// ─── Forgot password ────────────────────────────────────────────────────────

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

// ─── Reset password (also used by first-login password step) ────────────────

export const resetPasswordSchema = z
  .object({
    password: passwordField,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords do not match',
      });
    }
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

// ─── Change password (account settings) ────────────────────────────────────

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordField,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'New password and confirmation do not match',
      });
    }
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

