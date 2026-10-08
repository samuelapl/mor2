import { HELLO, Template } from './auth.templates';
import { renderLayout } from './layout';

/** Email copy of an in-app notification: same title and body, plus a link into the app. */
export const notification: Template<'notification'> = (ctx, locale, { title, body, link }) => {
  const am = locale === 'am';
  return {
    subject: `${ctx.appName} — ${title}`,
    ...renderLayout({
      appName: ctx.appName,
      paragraphs: [HELLO[locale], title, ...(body ? [body] : [])],
      button:
        link && ctx.appUrl ? { label: link.label, url: `${ctx.appUrl}${link.path}` } : undefined,
      notes: [
        am
          ? 'ይህን ኢሜይል የተቀበሉት የኢሜይል ማሳወቂያዎች ስለበሩ ነው። በመገለጫ ቅንብሮችዎ ውስጥ ሊያጠፏቸው ይችላሉ።'
          : 'You received this because email notifications are on. You can turn them off in your profile settings.',
      ],
    }),
  };
};
