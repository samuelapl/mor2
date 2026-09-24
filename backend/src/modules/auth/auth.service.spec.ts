import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PasswordResetPurpose } from '@prisma/client';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(async (value: string) => `h:${value}`),
  compare: jest.fn(async (value: string, hashed: string) => hashed === `h:${value}`),
}));

const TEMP_PASSWORD = 'Temp1234';

/** Minimal in-memory stand-in for the Prisma calls AuthService makes. */
function buildPrisma(user: any) {
  const resets: any[] = [];
  const matches = (row: any, where: any) =>
    Object.entries(where).every(([key, value]: [string, any]) => {
      if (value && typeof value === 'object' && 'gt' in value) return row[key] > value.gt;
      return row[key] === value;
    });

  return {
    resets,
    user: {
      findUnique: jest.fn(async ({ where }: any) =>
        (where.id ?? where.email) === (where.id ? user.id : user.email) ? { ...user } : null,
      ),
      update: jest.fn(async ({ data }: any) => Object.assign(user, data) && { ...user }),
    },
    passwordReset: {
      updateMany: jest.fn(async ({ where, data }: any) => {
        resets.filter((row) => matches(row, where)).forEach((row) => Object.assign(row, data));
      }),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `r${resets.length}`, attempts: 0, usedAt: null, createdAt: new Date(), ...data };
        resets.push(row);
        return row;
      }),
      findFirst: jest.fn(async ({ where }: any) =>
        [...resets].reverse().find((row) => matches(row, where)) ?? null,
      ),
      update: jest.fn(async ({ where, data }: any) =>
        Object.assign(resets.find((row) => row.id === where.id), data),
      ),
    },
    refreshToken: {
      updateMany: jest.fn(async () => ({ count: 0 })),
      create: jest.fn(async () => ({})),
    },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

describe('AuthService first-login password change', () => {
  let user: any;
  let prisma: ReturnType<typeof buildPrisma>;
  let mail: { sendFirstLoginCode: jest.Mock; sendPasswordResetCode: jest.Mock };
  let service: AuthService;

  const lastCode = (mock: jest.Mock) => mock.mock.calls[mock.mock.calls.length - 1][1] as string;

  beforeEach(() => {
    user = {
      id: 'u1',
      email: 'abebe@example.com',
      password: `h:${TEMP_PASSWORD}`,
      firstName: 'Abebe',
      lastName: 'Kebede',
      isActive: true,
      registrationStatus: 'APPROVED',
      mustChangePassword: true,
      roles: [{ role: 'LEARNER' }],
    };
    prisma = buildPrisma(user);
    mail = { sendFirstLoginCode: jest.fn(), sendPasswordResetCode: jest.fn() };
    const config = {
      get: (key: string, fallback?: string) =>
        ({ JWT_ACCESS_SECRET: 'access', JWT_REFRESH_SECRET: 'refresh' })[key] ?? fallback,
    };
    service = new AuthService(
      prisma as any,
      new JwtService({ secret: 'access' }),
      config as any,
      mail as any,
      { effectivePermissions: jest.fn(async () => ['course.browse']) } as any,
    );
  });

  async function startChallenge() {
    const res: any = await service.login({ email: user.email, password: TEMP_PASSWORD });
    return { res, code: lastCode(mail.sendFirstLoginCode) };
  }

  it('returns a challenge and emails a code instead of issuing tokens', async () => {
    const { res, code } = await startChallenge();

    expect(res).toEqual({
      passwordChangeRequired: true,
      challengeToken: expect.any(String),
      email: 'ab•••@example.com',
    });
    expect(res.accessToken).toBeUndefined();
    expect(code).toMatch(/^\d{6}$/);
    expect(prisma.resets[0].purpose).toBe(PasswordResetPurpose.FIRST_LOGIN);
  });

  it('still rejects a wrong temporary password without sending a code', async () => {
    await expect(service.login({ email: user.email, password: 'Wrong1234' })).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mail.sendFirstLoginCode).not.toHaveBeenCalled();
  });

  it('sets the new password, clears the flag and signs the user in', async () => {
    const { res, code } = await startChallenge();

    const session: any = await service.completeFirstLogin({
      challengeToken: res.challengeToken,
      code,
      newPassword: 'MyOwnPass1',
      confirmPassword: 'MyOwnPass1',
    });

    expect(session.accessToken).toEqual(expect.any(String));
    expect(session.user.password).toBeUndefined();
    expect(user.password).toBe('h:MyOwnPass1');
    expect(user.mustChangePassword).toBe(false);

    // The challenge can't be replayed once the change is done.
    await expect(
      service.completeFirstLogin({
        challengeToken: res.challengeToken,
        code,
        newPassword: 'Another123',
        confirmPassword: 'Another123',
      }),
    ).rejects.toThrow(UnauthorizedException);

    // Next login goes straight to a session.
    const next: any = await service.login({ email: user.email, password: 'MyOwnPass1' });
    expect(next.accessToken).toEqual(expect.any(String));
  });

  it.each([
    ['mismatched confirmation', { newPassword: 'MyOwnPass1', confirmPassword: 'MyOwnPass2' }],
    ['the temporary password', { newPassword: TEMP_PASSWORD, confirmPassword: TEMP_PASSWORD }],
    ['a weak password', { newPassword: 'short', confirmPassword: 'short' }],
  ])('rejects %s', async (_label, passwords) => {
    const { res, code } = await startChallenge();

    await expect(
      service.completeFirstLogin({ challengeToken: res.challengeToken, code, ...passwords }),
    ).rejects.toThrow(BadRequestException);
    expect(user.mustChangePassword).toBe(true);
  });

  it('rejects a wrong code and locks after too many attempts', async () => {
    const { res, code } = await startChallenge();
    const wrong = code === '111111' ? '222222' : '111111';
    const attempt = (c: string) =>
      service.completeFirstLogin({
        challengeToken: res.challengeToken,
        code: c,
        newPassword: 'MyOwnPass1',
        confirmPassword: 'MyOwnPass1',
      });

    for (let i = 0; i < 5; i++) {
      await expect(attempt(wrong)).rejects.toThrow('Invalid or expired code.');
    }
    // Even the right code no longer works once locked.
    await expect(attempt(code)).rejects.toThrow('Invalid or expired code.');
  });

  it('does not accept a forgot-password code for first login', async () => {
    const { res } = await startChallenge();
    await service.forgotPassword(user.email);
    const resetCode = lastCode(mail.sendPasswordResetCode);

    await expect(
      service.completeFirstLogin({
        challengeToken: res.challengeToken,
        code: resetCode,
        newPassword: 'MyOwnPass1',
        confirmPassword: 'MyOwnPass1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a forged or access-scoped challenge token', async () => {
    const accessToken = await new JwtService({ secret: 'access' }).signAsync({ sub: user.id });
    await expect(service.resendFirstLoginCode(accessToken)).rejects.toThrow(UnauthorizedException);
    await expect(service.resendFirstLoginCode('not-a-jwt')).rejects.toThrow(UnauthorizedException);
  });

  it('enforces the resend cooldown', async () => {
    const { res } = await startChallenge();
    await expect(service.resendFirstLoginCode(res.challengeToken)).rejects.toThrow(/Please wait/);

    prisma.resets[0].createdAt = new Date(Date.now() - 61_000);
    await expect(service.resendFirstLoginCode(res.challengeToken)).resolves.toMatchObject({
      email: 'ab•••@example.com',
    });
    expect(mail.sendFirstLoginCode).toHaveBeenCalledTimes(2);
  });

  it('clears the flag when the user resets via forgot password instead', async () => {
    await service.forgotPassword(user.email);
    await service.resetPassword({
      email: user.email,
      code: lastCode(mail.sendPasswordResetCode),
      newPassword: 'MyOwnPass1',
    });

    expect(user.mustChangePassword).toBe(false);
  });
});
