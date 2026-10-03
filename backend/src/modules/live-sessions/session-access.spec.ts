import { ForbiddenException } from '@nestjs/common';
import { assertCanRunSession } from './session-access';

describe('assertCanRunSession', () => {
  const prisma = (trainerId: string | null) =>
    ({ liveSession: { findUnique: jest.fn().mockResolvedValue({ trainerId }) } }) as any;
  const perms = (codes: string[]) =>
    ({ effectivePermissions: jest.fn().mockResolvedValue(codes) }) as any;
  const user = { id: 'u1', roles: ['TRAINER'] } as any;

  it('lets manage_all users run any session', async () => {
    await expect(
      assertCanRunSession(prisma('other'), perms(['live_session.manage_all']), user, 's1'),
    ).resolves.toBeUndefined();
  });

  it("lets a manage_own user run a session they're the trainer of", async () => {
    await expect(
      assertCanRunSession(prisma('u1'), perms(['live_session.manage_own']), user, 's1'),
    ).resolves.toBeUndefined();
  });

  it("refuses a manage_own user on someone else's session", async () => {
    await expect(
      assertCanRunSession(prisma('other'), perms(['live_session.manage_own']), user, 's1'),
    ).rejects.toThrow(ForbiddenException);
  });
});
