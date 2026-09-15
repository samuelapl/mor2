import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
import { PaginationQuery } from '@common/interfaces';
import { UpdateUserDto, ChangePasswordDto, AssignRoleDto, BulkCreateUsersDto } from './dto';
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
        include: { roles: true },
      }),
      this.prisma.user.count({ where }),
    ]);

    return buildPaginatedResponse(users.map(this.sanitizeUser), total, page, limit);
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: true },
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
      include: { roles: true },
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
      data: { password: hashedPassword },
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
   * returned (once) so the admin can copy it. Transactional.
   */
  async bulkCreate(dto: BulkCreateUsersDto) {
    const created: Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      role: RoleName;
    }> = [];
    const skipped: Array<{ email: string; reason: string }> = [];

    await this.prisma.$transaction(async (tx) => {
      const seenEmails = new Map<string, boolean>();

      for (const row of dto.users) {
        const email = row.email.trim().toLowerCase();

        if (seenEmails.has(email)) {
          skipped.push({ email, reason: 'Duplicate email in file' });
          continue;
        }
        seenEmails.set(email, true);

        const role = row.role ?? RoleName.LEARNER;
        const password =
          row.password && row.password.trim() ? row.password : generateTemporaryPassword();

        const policyError = passwordIssues(password);
        if (policyError) {
          skipped.push({ email, reason: policyError });
          continue;
        }

        const existing = await tx.user.findUnique({ where: { email } });
        if (existing) {
          skipped.push({ email, reason: 'Email already registered' });
          continue;
        }

        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const user = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            firstName: row.firstName.trim(),
            lastName: row.lastName.trim(),
            roles: { create: { role } },
          },
          select: { id: true, firstName: true, lastName: true, email: true },
        });

        created.push({ ...user, password, role });
      }
    });

    return {
      created,
      skipped,
      totals: { created: created.length, skipped: skipped.length },
    };
  }

  async assignRole(dto: AssignRoleDto) {
    await this.findById(dto.userId);

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

  async softDelete(id: string) {
    await this.findById(id);

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    return { message: 'User deleted successfully' };
  }

  private sanitizeUser(user: any) {
    const { password: _password, ...rest } = user;
    return rest;
  }
}
