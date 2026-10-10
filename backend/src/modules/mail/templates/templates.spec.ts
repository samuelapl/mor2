import { EmailJob } from '../email.types';
import { renderEmail } from './index';

const ctx = { appName: 'ELTMS', appUrl: 'https://lms.example.gov.et' };

const jobs: EmailJob[] = [
  { template: 'password-reset-code', to: 'a@x.et', locale: 'en', data: { code: '123456' } },
  { template: 'first-login-code', to: 'a@x.et', locale: 'en', data: { code: '123456' } },
  { template: 'password-changed', to: 'a@x.et', locale: 'en', data: {} },
  { template: 'email-verification-code', to: 'a@x.et', locale: 'en', data: { code: '123456' } },
  {
    template: 'notification',
    to: 'a@x.et',
    locale: 'en',
    data: {
      title: 'Certificate issued',
      body: 'Well done',
      link: { path: '/learner/certificates', label: 'View' },
    },
  },
];

describe('email templates', () => {
  it.each(jobs.flatMap((job) => [job, { ...job, locale: 'am' as const }]))(
    'renders $template ($locale) with subject, html and text',
    (job) => {
      const email = renderEmail(job, ctx);
      expect(email.subject).toContain('ELTMS');
      expect(email.html).toContain('ELTMS');
      expect(email.text.length).toBeGreaterThan(0);
    },
  );

  it('uses Amharic copy for the am locale', () => {
    const email = renderEmail({ ...jobs[0], locale: 'am' }, ctx);
    expect(email.subject).toContain('የይለፍ ቃል');
    expect(email.text).not.toContain('Your password reset code');
  });

  it('shows the code spaced in html and raw in text', () => {
    const email = renderEmail(jobs[0], ctx);
    expect(email.html).toContain('123 456');
    expect(email.text).toContain('123456');
  });

  it('escapes user-provided values in the html body', () => {
    const email = renderEmail(
      {
        template: 'notification',
        to: 'a@x.et',
        locale: 'en',
        data: { title: 'Course "<script>alert(1)</script>" approved' },
      },
      ctx,
    );
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
    // Plain text is not HTML, so it keeps the value as typed.
    expect(email.text).toContain('<script>alert(1)</script>');
  });

  it('links to the app when a public URL is set, and omits the link otherwise', () => {
    const withLink = jobs[jobs.length - 1];
    expect(renderEmail(withLink, ctx).text).toContain(
      'https://lms.example.gov.et/learner/certificates',
    );
    expect(renderEmail(withLink, { appName: 'ELTMS' }).html).not.toContain('href=');
  });
});
