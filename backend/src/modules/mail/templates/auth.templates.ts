import { EmailContext, EmailJob, EmailLocale, RenderedEmail } from '../email.types';
import { renderLayout } from './layout';

export type DataFor<T extends EmailJob['template']> = Extract<EmailJob, { template: T }>['data'];

export type Template<T extends EmailJob['template']> = (
  ctx: EmailContext,
  locale: EmailLocale,
  data: DataFor<T>,
) => RenderedEmail;

export const HELLO: Record<EmailLocale, string> = { en: 'Hello,', am: 'ሰላም፣' };

const CODE_EXPIRY: Record<EmailLocale, string> = {
  en: 'This code expires in 10 minutes.',
  am: 'ይህ ኮድ በ10 ደቂቃ ውስጥ ጊዜው ያልፍበታል።',
};

export const passwordResetCode: Template<'password-reset-code'> = (ctx, locale, { code }) => {
  const am = locale === 'am';
  return {
    subject: am
      ? `${ctx.appName} — የይለፍ ቃል ዳግም ማስጀመሪያ ኮድ`
      : `${ctx.appName} — Your password reset code`,
    ...renderLayout({
      appName: ctx.appName,
      paragraphs: [
        HELLO[locale],
        am ? 'የይለፍ ቃል ዳግም ማስጀመሪያ ኮድዎ የሚከተለው ነው፦' : 'Your password reset code is:',
      ],
      code,
      notes: [
        CODE_EXPIRY[locale],
        am
          ? 'ይህን ካልጠየቁ ይህን ኢሜይል ችላ ማለት ይችላሉ።'
          : "If you didn't request this, you can safely ignore this email.",
      ],
    }),
  };
};

export const firstLoginCode: Template<'first-login-code'> = (ctx, locale, { code }) => {
  const am = locale === 'am';
  return {
    subject: am ? `${ctx.appName} — የይለፍ ቃልዎን ያዘጋጁ` : `${ctx.appName} — Set your password`,
    ...renderLayout({
      appName: ctx.appName,
      paragraphs: [
        HELLO[locale],
        am
          ? `ወደ ${ctx.appName} እንኳን በደህና መጡ! መግባትዎን ለማጠናቀቅ ይህን ኮድ ያስገቡ እና የራስዎን የይለፍ ቃል ይምረጡ፦`
          : `Welcome to ${ctx.appName}! To finish signing in, enter this code and choose your own password:`,
      ],
      code,
      notes: [
        CODE_EXPIRY[locale],
        am
          ? 'አሁን ለመግባት ካልሞከሩ አስተዳዳሪዎን ያነጋግሩ — ጊዜያዊ የይለፍ ቃልዎን ሌላ ሰው ሊያውቅ ይችላል።'
          : "If you didn't just try to sign in, contact your administrator — someone may know your temporary password.",
      ],
    }),
  };
};

export const passwordChanged: Template<'password-changed'> = (ctx, locale) => {
  const am = locale === 'am';
  return {
    subject: am ? `${ctx.appName} — የይለፍ ቃልዎ ተቀይሯል` : `${ctx.appName} — Your password was changed`,
    ...renderLayout({
      appName: ctx.appName,
      paragraphs: [
        HELLO[locale],
        am
          ? `የ${ctx.appName} መለያዎ የይለፍ ቃል አሁን ተቀይሯል። ይህን ያደረጉት እርስዎ ከሆኑ ምንም ማድረግ አያስፈልግዎትም።`
          : `The password for your ${ctx.appName} account was just changed. If this was you, no action is needed.`,
      ],
      notes: [
        am
          ? 'ይህን ያላደረጉት እርስዎ ካልሆኑ ወዲያውኑ አስተዳዳሪን ያነጋግሩ።'
          : "If you didn't do this, contact an administrator immediately.",
      ],
    }),
  };
};

export const emailVerificationCode: Template<'email-verification-code'> = (
  ctx,
  locale,
  { code },
) => {
  const am = locale === 'am';
  return {
    subject: am ? `${ctx.appName} — ኢሜይልዎን ያረጋግጡ` : `${ctx.appName} — Verify your email`,
    ...renderLayout({
      appName: ctx.appName,
      paragraphs: [
        HELLO[locale],
        am
          ? `ወደ ${ctx.appName} እንኳን በደህና መጡ! ኢሜይልዎን ለማረጋገጥ እና መለያዎን ለማንቃት ይህን ኮድ ያስገቡ፦`
          : `Welcome to ${ctx.appName}! Enter this code to verify your email and activate your account:`,
      ],
      code,
      notes: [
        CODE_EXPIRY[locale],
        am
          ? 'በ{app} ላይ ካልተመዘገቡ ይህን ኢሜይል ችላ ማለት ይችላሉ።'.replace('{app}', ctx.appName)
          : `If you didn't sign up for ${ctx.appName}, you can safely ignore this email.`,
      ],
    }),
  };
};
