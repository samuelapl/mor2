import { NotificationType } from '@prisma/client';
import { NotificationsService } from './notifications.service';

describe('NotificationsService email fan-out', () => {
  let prisma: any;
  let emailQueue: { notifications: jest.Mock };
  let service: NotificationsService;
  const titles = { en: 'Hi', am: 'ሰላም' };

  beforeEach(() => {
    prisma = {
      notification: {
        create: jest.fn(async () => ({ id: 'n1' })),
        createManyAndReturn: jest.fn(async ({ data }: any) =>
          data.map((_: unknown, i: number) => ({ id: `n${i + 1}` })),
        ),
      },
    };
    emailQueue = { notifications: jest.fn(async () => undefined) };
    service = new NotificationsService(prisma, emailQueue as any);
  });

  it('send queues an email for the new notification', async () => {
    await service.send('u1', NotificationType.SYSTEM, titles);
    expect(emailQueue.notifications).toHaveBeenCalledWith(['n1']);
  });

  it('sendToMany queues all new notifications in one call', async () => {
    await service.sendToMany(['u1', 'u2', 'u3'], NotificationType.SYSTEM, titles);
    expect(emailQueue.notifications).toHaveBeenCalledTimes(1);
    expect(emailQueue.notifications).toHaveBeenCalledWith(['n1', 'n2', 'n3']);
  });

  it('keeps notifications in-app only with { email: false }', async () => {
    await service.send('u1', NotificationType.SYSTEM, titles, undefined, undefined, {
      email: false,
    });
    await service.sendToMany(['u1'], NotificationType.SYSTEM, titles, undefined, undefined, {
      email: false,
    });
    expect(emailQueue.notifications).not.toHaveBeenCalled();
  });
});
