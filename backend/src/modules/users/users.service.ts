import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalStatus, NotificationType, Prisma, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@config/prisma.service';
import {
  buildPaginationArgs,
  buildPaginatedResponse,
  buildSearchFilter,
  buildOrderBy,
  generateTemporaryPassword,
  passwordIssues,
} from '@common/utils';
import { AuthenticatedUser, PaginationQuery } from '@common/interfaces';
import {
  UpdateUserDto,
  ChangePasswordDto,
  AssignRoleDto,
  BulkCreateUsersDto,
  CreateActorDto,
} from './dto';
import { BCRYPT_ROUNDS } from '@config/constants';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { MailService } from '@modules/mail/mail.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
  ) {}

  async findAll(query: PaginationQuery & { role?: RoleName; registrationStatus?: ApprovalStatus }) {
    const { page, limit, skip } = buildPaginationArgs(query);
    const searchFilter = buildSearchFilter(query.search, ['firstName', 'lastName', 'email']);
    const orderBy = buildOrderBy(query.sortBy, query.sortOrder);

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(searchFilter as any),
      ...(query.role ? { roles: { some: { role: query.role } } } : {}),
      ...(query.registrationStatus ? { registrationStatus: query.registrationStatus } : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { roles: true, primaryVenue: true },
      }),
      this.prisma.user.count({ where }),
    ]);

    return buildPaginatedResponse(users.map(this.sanitizeUser), total, page, limit);
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: true, primaryVenue: true },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findById(id);

    const updated = await this.prisma.user.update({
      where: { id },
      data: dto,
      include: { roles: true, primaryVenue: true },
    });

    return this.sanitizeUser(updated);
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new ForbiddenException('Current password is incorrect');
    }

    const policyError = passwordIssues(dto.newPassword);
    if (policyError) {
      throw new ForbiddenException(policyError);
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  async adminResetPassword(id: string, newPassword: string) {
    await this.findById(id);

    const policyError = passwordIssues(newPassword);
    if (policyError) {
      throw new ForbiddenException(policyError);
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword, mustChangePassword: true },
    });

    // Force the user to re-authenticate after a forced reset
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Password reset successfully' };
  }

  /**
   * Bulk-creates users from a spreadsheet import (CSV/XLSX).
   * Idempotent by email: rows whose email already exists are skipped.
   * Blank passwords get an auto-generated policy-compliant password that is
   * returned (once) so the admin can copy it.
   *
   * Each row is created independently (not one wrapping transaction): bcrypt at
   * BCRYPT_ROUNDS costs ~250ms per row, which blew the interactive-transaction
   * timeout on imports of ~20+ rows and rolled back the whole file. A bad row is
   * reported in `skipped` instead of failing the rest. `row` is the 1-based
   * position in the submitted `users` array.
   */
  async bulkCreate(dto: BulkCreateUsersDto, actor?: AuthenticatedUser) {
    const created: Array<{
      row: number;
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
      tin: string | null;
      password: string;
      role: string;
    }> = [];
    const skipped: Array<{ row: number; email: string; reason: string }> = [];

    const emails = dto.users.map((row) => row.email.trim().toLowerCase());
    const [existingUsers, roles] = await Promise.all([
      this.prisma.user.findMany({ where: { email: { in: emails } }, select: { email: true } }),
      this.prisma.role.findMany({ select: { name: true } }),
    ]);
    const existingEmails = new Set(existingUsers.map((user) => user.email));
    const roleNames = new Set(roles.map((role) => role.name));
    const actorIsSystemAdmin = actor?.roles.includes(RoleName.SYSTEM_ADMIN) ?? false;

    const seenEmails = new Set<string>();
    const accepted: Array<{
      row: number;
      email: string;
      firstName: string;
      lastName: string;
      phone: string;
      tin: string | null;
      password: string;
      role: string;
    }> = [];

    dto.users.forEach((item, index) => {
      const row = index + 1;
      const email = emails[index];

      if (seenEmails.has(email)) {
        skipped.push({ row, email, reason: 'Duplicate email in file' });
        return;
      }
      seenEmails.add(email);

      if (existingEmails.has(email)) {
        skipped.push({ row, email, reason: 'Email already registered' });
        return;
      }

      const phone = item.phone.trim();
      if (!phone) {
        skipped.push({ row, email, reason: 'Phone number is required' });
        return;
      }

      const role = item.role?.trim() || RoleName.LEARNER;
      if (!roleNames.has(role)) {
        skipped.push({ row, email, reason: `Role "${role}" does not exist` });
        return;
      }
      if (role === RoleName.SYSTEM_ADMIN && !actorIsSystemAdmin) {
        skipped.push({
          row,
          email,
          reason: 'Only a System Admin can assign the System Admin role',
        });
        return;
      }

      const password = item.password?.trim() ? item.password : generateTemporaryPassword();
      const policyError = passwordIssues(password);
      if (policyError) {
        skipped.push({ row, email, reason: policyError });
        return;
      }

      accepted.push({
        row,
        email,
        firstName: item.firstName.trim(),
        lastName: item.lastName.trim(),
        phone,
        tin: item.tin?.trim() || null,
        password,
        role,
      });
    });

    // bcrypt runs on libuv's threadpool, so hashing concurrently is several times faster.
    const hashes = await Promise.all(
      accepted.map((row) => bcrypt.hash(row.password, BCRYPT_ROUNDS)),
    );

    for (const [index, row] of accepted.entries()) {
      try {
        const user = await this.prisma.user.create({
          data: {
            email: row.email,
            password: hashes[index],
            firstName: row.firstName,
            lastName: row.lastName,
            phone: row.phone,
            tin: row.tin,
            registrationStatus: ApprovalStatus.APPROVED,
            isActive: true,
            mustChangePassword: true,
            roles: { create: { role: row.role } },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            tin: true,
          },
        });
        created.push({ row: row.row, ...user, password: row.password, role: row.role });
      } catch (err) {
        // Someone registered the same email between the pre-check and this insert.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          skipped.push({ row: row.row, email: row.email, reason: 'Email already registered' });
          continue;
        }
        throw err;
      }
    }

    skipped.sort((a, b) => a.row - b.row);

    return {
      created,
      skipped,
      totals: { created: created.length, skipped: skipped.length },
    };
  }

  private async assertRoleExists(role: string) {
    const found = await this.prisma.role.findUnique({ where: { name: role } });
    if (!found) {
      throw new BadRequestException(`Role "${role}" does not exist`);
    }
  }

  async createActor(dto: CreateActorDto) {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    await this.assertRoleExists(dto.role);

    const policyError = passwordIssues(dto.password);
    if (policyError) {
      throw new BadRequestException(policyError);
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone,
        locale: dto.locale || 'en',
        registrationStatus: ApprovalStatus.APPROVED,
        isActive: true,
        mustChangePassword: true,
        primaryVenueId: dto.primaryVenueId || null,
        roles: {
          create: { role: dto.role },
        },
      },
      include: { roles: true, primaryVenue: true },
    });

    return { message: 'Actor registered', user: this.sanitizeUser(user) };
  }

  async assignRole(dto: AssignRoleDto) {
    await this.findById(dto.userId);
    await this.assertRoleExists(dto.role);

    return this.prisma.userRole.create({
      data: {
        userId: dto.userId,
        role: dto.role,
      },
    });
  }

  async removeRole(userId: string, role: RoleName) {
    await this.prisma.userRole.deleteMany({
      where: { userId, role },
    });

    return { message: `Role ${role} removed from user` };
  }

  async approveRegistration(userId: string) {
    const user = await this.findById(userId);

    if (user.registrationStatus === 'REJECTED') {
      throw new ForbiddenException('Cannot approve a rejected registration');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { registrationStatus: ApprovalStatus.APPROVED, isActive: true },
    });

    const updated = await this.findById(userId);

    try {
      await this.notificationsService.send(
        userId,
        NotificationType.REGISTRATION_APPROVED,
        {
          en: 'Registration approved',
          am: 'ምዝገባ ጸድቋል',
        },
        {
          en: 'Your registration has been approved. You can now sign in and start learning.',
          am: 'ምዝገባዎ ተጸድቋል። አሁን መግባት እና መማር ይችላሉ።',
        },
        { registrationStatus: 'APPROVED' },
      );
    } catch {
      // non-fatal
    }

    try {
      await this.mailService.sendRegistrationApproved(user.email);
    } catch {
      // non-fatal
    }

    return { message: 'Registration approved', user: this.sanitizeUser(updated) };
  }

  async rejectRegistration(userId: string, reason?: string) {
    const user = await this.findById(userId);

    if (user.registrationStatus === 'REJECTED') {
      throw new ForbiddenException('Registration is already rejected');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { registrationStatus: ApprovalStatus.REJECTED, isActive: true },
      }),
      // Revoke any existing sessions so the account cannot keep using stale tokens.
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    try {
      await this.notificationsService.send(
        userId,
        NotificationType.REGISTRATION_REJECTED,
        {
          en: 'Registration rejected',
          am: 'ምዝገባ ውድቅ ሆኗል',
        },
        {
          en: reason || 'Your registration was rejected. Contact an administrator.',
          am: reason || 'ምዝገባዎ ውድቅ ሆኗል። እባክዎ አስተዳዳሪን ያግኙ።',
        },
        { registrationStatus: 'REJECTED', reason },
      );
    } catch {
      // non-fatal
    }

    try {
      await this.mailService.sendRegistrationRejected(user.email, reason);
    } catch {
      // non-fatal
    }

    const updated = await this.findById(userId);

    return { message: 'Registration rejected', user: this.sanitizeUser(updated) };
  }

  async deactivate(id: string) {
    await this.findById(id);

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'User deactivated successfully' };
  }

  async reactivate(id: string) {
    await this.findById(id);

    await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });

    return { message: 'User reactivated successfully' };
  }

  /**
   * Soft-deletes a user: history (enrollments, certificates, audit logs) is kept, but the
   * account can no longer sign in and its email is freed for re-registration by renaming
   * it to `deleted:<timestamp>:<original email>`.
   */
  async softDelete(id: string, actor?: AuthenticatedUser) {
    const user = await this.findById(id);

    if (actor?.id === id) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    const targetIsSystemAdmin = user.roles.some((r) => r.role === RoleName.SYSTEM_ADMIN);
    if (targetIsSystemAdmin && !actor?.roles.includes(RoleName.SYSTEM_ADMIN)) {
      throw new ForbiddenException('Only a System Admin can delete a System Admin');
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: {
          deletedAt: now,
          isActive: false,
          email: `deleted:${now.getTime()}:${user.email}`,
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);

    return { message: 'User deleted successfully' };
  }

  private sanitizeUser(user: any) {
    const { password: _password, ...rest } = user;
    return rest;
  }
}
