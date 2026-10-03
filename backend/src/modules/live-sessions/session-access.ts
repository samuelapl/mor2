import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import type { PrismaService } from '@config/prisma.service';
import type { PermissionsService } from '@modules/permissions/permissions.service';
import type { AuthenticatedUser } from '@common/interfaces';

/**
 * Running a session (start / end it, grade or prepare its quizzes): anyone with
 * live_session.manage_all, otherwise (live_session.manage_own) only the session's own trainer.
 */
export async function assertCanRunSession(
  prisma: PrismaService,
  permissions: PermissionsService,
  user: AuthenticatedUser,
  sessionId: string,
): Promise<void> {
  if (user.roles.includes(RoleName.SYSTEM_ADMIN)) return;
  const codes = await permissions.effectivePermissions(user.roles);
  if (codes.includes('live_session.manage_all')) return;

  const session = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    select: { trainerId: true },
  });
  if (!session) throw new NotFoundException('Live session not found');
  if (session.trainerId !== user.id) {
    throw new ForbiddenException('You can only manage sessions you are the trainer of');
  }
}
