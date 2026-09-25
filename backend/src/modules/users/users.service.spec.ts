import { Prisma, RoleName } from '@prisma/client';
import { UsersService } from './users.service';
import { AuthenticatedUser } from '@common/interfaces';
import { BulkCreateUserItemDto } from './dto';

jest.mock('bcrypt', () => ({
  hash: jest.fn(async (value: string) => `hashed:${value}`),
}));

function buildUser(roles: RoleName[]): AuthenticatedUser {
  return {
    id: 'admin-1',
    email: 'a@example.com',
    firstName: 'A',
    lastName: 'Dmin',
    roles,
    sid: 'sid-1',
  };
}

function row(overrides: Partial<BulkCreateUserItemDto> = {}): BulkCreateUserItemDto {
  return {
    firstName: 'Abebe',
    lastName: 'Kebede',
    email: 'abebe@example.com',
    phone: '+251911000000',
    ...overrides,
  };
}

describe('UsersService.bulkCreate', () => {
  let prisma: any;
  let service: UsersService;

  beforeEach(() => {
    prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(async ({ data }: any) => ({
          id: `id-${data.email}`,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          tin: data.tin,
        })),
      },
      role: {
        findMany: jest.fn().mockResolvedValue(Object.values(RoleName).map((name) => ({ name }))),
      },
    };
    service = new UsersService(prisma, {} as any, {} as any);
  });

  const admin = buildUser([RoleName.SYSTEM_ADMIN]);

  it('stores phone and TIN, and turns a blank TIN into null', async () => {
    const result = await service.bulkCreate(
      {
        users: [
          row({ tin: ' 0012345678 ', password: 'Welcome2026' }),
          row({ email: 'sara@example.com', tin: '  ', password: 'Welcome2026' }),
        ],
      },
      admin,
    );

    expect(result.totals).toEqual({ created: 2, skipped: 0 });
    expect(prisma.user.create.mock.calls[0][0].data).toMatchObject({
      phone: '+251911000000',
      tin: '0012345678',
      password: 'hashed:Welcome2026',
      mustChangePassword: true,
      roles: { create: { role: RoleName.LEARNER } },
    });
    expect(prisma.user.create.mock.calls[1][0].data.tin).toBeNull();
  });

  it('generates a policy-compliant password when blank and returns it once', async () => {
    const result = await service.bulkCreate({ users: [row()] }, admin);

    expect(result.created[0].password).toMatch(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/);
    expect(prisma.user.create.mock.calls[0][0].data.password).toBe(
      `hashed:${result.created[0].password}`,
    );
  });

  it('skips duplicates in the file, existing emails, bad roles and weak passwords', async () => {
    prisma.user.findMany.mockResolvedValue([{ email: 'taken@example.com' }]);

    const result = await service.bulkCreate(
      {
        users: [
          row({ email: 'Abebe@Example.com' }),
          row({ email: 'abebe@example.com' }),
          row({ email: 'taken@example.com' }),
          row({ email: 'ghost@example.com', role: 'NOT_A_ROLE' }),
          row({ email: 'weak@example.com', password: 'short' }),
        ],
      },
      admin,
    );

    expect(result.created.map((c) => c.email)).toEqual(['abebe@example.com']);
    expect(result.skipped.map((s) => [s.row, s.reason])).toEqual([
      [2, 'Duplicate email in file'],
      [3, 'Email already registered'],
      [4, 'Role "NOT_A_ROLE" does not exist'],
      [5, expect.any(String)],
    ]);
  });

  it('does not let a non-System-Admin assign the System Admin role', async () => {
    const result = await service.bulkCreate(
      { users: [row({ role: RoleName.SYSTEM_ADMIN })] },
      buildUser([RoleName.TRAINING_ADMIN]),
    );

    expect(result.totals).toEqual({ created: 0, skipped: 1 });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('reports a unique-constraint race as skipped instead of failing the import', async () => {
    prisma.user.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const result = await service.bulkCreate(
      { users: [row(), row({ email: 'sara@example.com' })] },
      admin,
    );

    expect(result.totals).toEqual({ created: 1, skipped: 1 });
    expect(result.skipped[0]).toMatchObject({ row: 1, reason: 'Email already registered' });
  });

  it('creates every row of a large import', async () => {
    const users = Array.from({ length: 50 }, (_, i) => row({ email: `user${i}@example.com` }));

    const result = await service.bulkCreate({ users }, admin);

    expect(result.totals).toEqual({ created: 50, skipped: 0 });
  });
});

describe('UsersService.softDelete', () => {
  let prisma: any;
  let service: UsersService;
  let target: any;

  beforeEach(() => {
    target = {
      id: 'u2',
      email: 'abebe@example.com',
      password: 'x',
      deletedAt: null,
      roles: [{ role: RoleName.LEARNER }],
    };
    prisma = {
      user: {
        findUnique: jest.fn(async () => target),
        update: jest.fn(async ({ data }: any) => ({ ...target, ...data })),
      },
      refreshToken: { updateMany: jest.fn(async () => ({ count: 1 })) },
      $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    service = new UsersService(prisma, {} as any, {} as any);
  });

  it('frees the email, deactivates and revokes sessions', async () => {
    await service.softDelete('u2', buildUser([RoleName.SYSTEM_ADMIN]));

    const data = prisma.user.update.mock.calls[0][0].data;
    expect(data).toMatchObject({ isActive: false, deletedAt: expect.any(Date) });
    expect(data.email).toMatch(/^deleted:\d+:abebe@example\.com$/);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u2', revokedAt: null } }),
    );
  });

  it('refuses to delete yourself', async () => {
    await expect(service.softDelete('admin-1', buildUser([RoleName.SYSTEM_ADMIN]))).rejects.toThrow(
      'You cannot delete your own account',
    );
  });

  it('only lets a System Admin delete a System Admin', async () => {
    target.roles = [{ role: RoleName.SYSTEM_ADMIN }];
    await expect(service.softDelete('u2', buildUser([RoleName.TRAINING_ADMIN]))).rejects.toThrow(
      'Only a System Admin can delete a System Admin',
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
