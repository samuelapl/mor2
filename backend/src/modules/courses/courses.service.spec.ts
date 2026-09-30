import { CourseStatus, RoleName } from '@prisma/client';
import { CoursesService } from './courses.service';
import { CourseStateMachine } from './statemachine/course-state-machine';
import { AuthenticatedUser } from '@common/interfaces';

function buildUser(roles: RoleName[], id = 'user-1'): AuthenticatedUser {
  return { id, email: 'u@example.com', firstName: 'U', lastName: 'Ser', roles, sid: 'sid-1' };
}

describe('CoursesService.visibilityWhere', () => {
  let service: CoursesService;

  beforeEach(() => {
    service = new CoursesService({} as any, new CourseStateMachine(), {} as any, {} as any);
  });

  async function visibilityWhere(user: AuthenticatedUser, status?: CourseStatus) {
    return (service as any).visibilityWhere(user, status);
  }

  it('scopes Course Owner to their own courses', async () => {
    const user = buildUser([RoleName.COURSE_OWNER]);
    expect(await visibilityWhere(user)).toEqual({ owners: { some: { userId: user.id } } });
  });

  it('scopes Trainer to their assigned courses, not all courses', async () => {
    const user = buildUser([RoleName.TRAINER]);
    expect(await visibilityWhere(user)).toEqual({ trainers: { some: { userId: user.id } } });
  });

  it('lets Content Approver see all courses', async () => {
    const user = buildUser([RoleName.CONTENT_APPROVER]);
    expect(await visibilityWhere(user)).toEqual({});
  });

  it('lets Training Admin see all courses', async () => {
    const user = buildUser([RoleName.TRAINING_ADMIN]);
    expect(await visibilityWhere(user)).toEqual({});
  });

  it('lets System Admin see all courses', async () => {
    const user = buildUser([RoleName.SYSTEM_ADMIN]);
    expect(await visibilityWhere(user)).toEqual({});
  });

  it('scopes Learner to published courses only', async () => {
    const user = buildUser([RoleName.LEARNER]);
    expect(await visibilityWhere(user)).toEqual({ status: CourseStatus.PUBLISHED });
  });

  it('falls back to published courses when the user has no recognized roles', async () => {
    const user = buildUser([]);
    expect(await visibilityWhere(user)).toEqual({ status: CourseStatus.PUBLISHED });
  });

  it('composes a requested status filter with the scope via AND', async () => {
    const user = buildUser([RoleName.COURSE_OWNER]);
    expect(await visibilityWhere(user, CourseStatus.DRAFT)).toEqual({
      AND: [{ owners: { some: { userId: user.id } } }, { status: CourseStatus.DRAFT }],
    });
  });

  it('composes a requested status filter for broad staff roles', async () => {
    const user = buildUser([RoleName.TRAINING_ADMIN]);
    expect(await visibilityWhere(user, CourseStatus.PENDING_APPROVAL)).toEqual({
      status: CourseStatus.PENDING_APPROVAL,
    });
  });

  describe('permission-based visibility', () => {
    it('scopes user with course.view.assigned permission to assigned courses only', async () => {
      const user = { ...buildUser([RoleName.TRAINER]), permissions: ['course.view.assigned'] };
      expect(await visibilityWhere(user)).toEqual({ trainers: { some: { userId: user.id } } });
    });

    it('allows user with course.view.all permission to see all courses', async () => {
      const user = { ...buildUser([RoleName.TRAINER]), permissions: ['course.view.all', 'course.view.assigned'] };
      expect(await visibilityWhere(user)).toEqual({});
    });

    it('scopes user with course.view.own permission to owned courses only', async () => {
      const user = { ...buildUser([]), permissions: ['course.view.own'] };
      expect(await visibilityWhere(user)).toEqual({ owners: { some: { userId: user.id } } });
    });

    it('combines course.view.assigned and course.view.own with OR', async () => {
      const user = { ...buildUser([]), permissions: ['course.view.assigned', 'course.view.own'] };
      expect(await visibilityWhere(user)).toEqual({
        OR: [
          { owners: { some: { userId: user.id } } },
          { trainers: { some: { userId: user.id } } },
        ],
      });
    });

    it('scopes user with course.browse permission to published courses', async () => {
      const user = { ...buildUser([]), permissions: ['course.browse'] };
      expect(await visibilityWhere(user)).toEqual({ status: CourseStatus.PUBLISHED });
    });
  });
});
