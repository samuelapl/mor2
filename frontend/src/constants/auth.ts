import type { Role } from "@/types";

export const DEMO_USER_BY_ROLE: Record<Role, string> = {
  course_owner: "u1",
  content_approver: "u2",
  training_admin: "u3",
  trainer: "u4",
  learner: "u5",
  system_admin: "u6",
};

export interface MockAccount {
  role: Role;
  email: string;
  password: string;
}

export const MOCK_PASSWORD = "password";

export const MOCK_ACCOUNTS: MockAccount[] = [
  { role: "course_owner", email: "owner@gmail.com", password: MOCK_PASSWORD },
  { role: "content_approver", email: "approver@gmail.com", password: MOCK_PASSWORD },
  { role: "training_admin", email: "tadministrator@gmail.com", password: MOCK_PASSWORD },
  { role: "trainer", email: "trainer@gmail.com", password: MOCK_PASSWORD },
  { role: "learner", email: "learner@gmail.com", password: MOCK_PASSWORD },
  { role: "system_admin", email: "sadministrator@gmail.com", password: MOCK_PASSWORD },
];

export const MIN_PASSWORD_LENGTH = 8;

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function passwordIssues(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include at least one letter and one number.";
  }
  return null;
}
