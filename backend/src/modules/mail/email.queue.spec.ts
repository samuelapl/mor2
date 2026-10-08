import { EmailQueue } from './email.queue';
import { EmailPriority } from './email.types';

const fakeQueue = {
  on: jest.fn(),
  add: jest.fn(),
  close: jest.fn(async () => undefined),
  client: Promise.resolve({ status: 'ready' }) as Promise<{ status: string }>,
};

jest.mock('bullmq', () => ({ Queue: jest.fn(() => fakeQueue) }));

describe('EmailQueue', () => {
  let mail: { deliver: jest.Mock; isConfigured: boolean };
  let queue: EmailQueue;

  beforeEach(() => {
    fakeQueue.add.mockReset().mockResolvedValue({});
    fakeQueue.client = Promise.resolve({ status: 'ready' });
    mail = { deliver: jest.fn(async () => undefined), isConfigured: true };
    queue = new EmailQueue({ get: () => undefined } as any, mail as any);
  });

  it('queues security emails with the highest priority', async () => {
    await queue.passwordResetCode('a@x.et', '123456', 'am');

    expect(fakeQueue.add).toHaveBeenCalledWith(
      'password-reset-code',
      { template: 'password-reset-code', to: 'a@x.et', locale: 'am', data: { code: '123456' } },
      { priority: EmailPriority.SECURITY },
    );
    expect(mail.deliver).not.toHaveBeenCalled();
  });

  it('queues the email verification code with the highest priority', async () => {
    await queue.emailVerificationCode('a@x.et', '111222', 'en');

    expect(fakeQueue.add).toHaveBeenCalledWith(
      'email-verification-code',
      expect.objectContaining({ template: 'email-verification-code', data: { code: '111222' } }),
      { priority: EmailPriority.SECURITY },
    );
  });

  it('sends inline when Redis is not connected', async () => {
    fakeQueue.client = Promise.resolve({ status: 'reconnecting' });

    await queue.passwordChanged('a@x.et', 'en');

    expect(fakeQueue.add).not.toHaveBeenCalled();
    expect(mail.deliver).toHaveBeenCalledWith(
      expect.objectContaining({ template: 'password-changed', to: 'a@x.et' }),
    );
  });

  it('sends inline when Redis never answers', async () => {
    jest.useFakeTimers();
    try {
      fakeQueue.client = new Promise(() => undefined);
      const pending = queue.firstLoginCode('a@x.et', '654321', 'en');
      await jest.advanceTimersByTimeAsync(2_000);
      await pending;
    } finally {
      jest.useRealTimers();
    }

    expect(fakeQueue.add).not.toHaveBeenCalled();
    expect(mail.deliver).toHaveBeenCalledWith(
      expect.objectContaining({ template: 'first-login-code', data: { code: '654321' } }),
    );
  });

  it('sends inline when adding the job fails', async () => {
    fakeQueue.add.mockRejectedValue(new Error('Stream not writeable'));

    await queue.passwordChanged('a@x.et', 'en');

    expect(mail.deliver).toHaveBeenCalledTimes(1);
  });

  it('never throws, even when the inline send fails too', async () => {
    fakeQueue.client = Promise.resolve({ status: 'reconnecting' });
    mail.deliver.mockRejectedValue(new Error('SMTP down'));

    await expect(queue.passwordResetCode('a@x.et', '123456', 'en')).resolves.toBeUndefined();
  });
});

describe('EmailQueue.notifications', () => {
  let mail: { deliver: jest.Mock; isConfigured: boolean };
  let queue: EmailQueue;

  beforeEach(() => {
    (fakeQueue as any).addBulk = jest.fn(async () => []);
    fakeQueue.client = Promise.resolve({ status: 'ready' });
    mail = { deliver: jest.fn(async () => undefined), isConfigured: true };
    queue = new EmailQueue({ get: () => undefined } as any, mail as any);
  });

  it('queues one job per notification, keyed by the notification id', async () => {
    await queue.notifications(['n1', 'n2']);

    expect((fakeQueue as any).addBulk).toHaveBeenCalledWith([
      {
        name: 'notification-ref',
        data: { template: 'notification-ref', notificationId: 'n1' },
        opts: { jobId: 'notification-n1', priority: EmailPriority.NORMAL },
      },
      {
        name: 'notification-ref',
        data: { template: 'notification-ref', notificationId: 'n2' },
        opts: { jobId: 'notification-n2', priority: EmailPriority.NORMAL },
      },
    ]);
  });

  it('skips (does not send inline) when Redis is down', async () => {
    fakeQueue.client = Promise.resolve({ status: 'reconnecting' });

    await queue.notifications(['n1']);

    expect((fakeQueue as any).addBulk).not.toHaveBeenCalled();
    expect(mail.deliver).not.toHaveBeenCalled();
  });

  it('does nothing for an empty list', async () => {
    await queue.notifications([]);
    expect((fakeQueue as any).addBulk).not.toHaveBeenCalled();
  });
});
