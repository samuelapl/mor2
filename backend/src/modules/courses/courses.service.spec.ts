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
    service = new CoursesService({} as any, new CourseStateMachine(), {} as any);
  });

  function visibilityWhere(user: AuthenticatedUser, status?: CourseStatus) {
    return (service as any).visibilityWhere(user, status);
  }

  it('scopes Course Owner to their own courses', () => {
    const user = buildUser([RoleName.COURSE_OWNER]);
    expect(visibilityWhere(user)).toEqual({ owners: { some: { userId: user.id } } });
  });

  it('scopes Trainer to their assigned courses, not all courses', () => {
    const user = buildUser([RoleName.TRAINER]);
    expect(visibilityWhere(user)).toEqual({ trainers: { some: { userId: user.id } } });
  });

  it('lets Content Approver see all courses', () => {
    const user = buildUser([RoleName.CONTENT_APPROVER]);
    expect(visibilityWhere(user)).toEqual({});
  });

  it('lets Training Admin see all courses', () => {
    const user = buildUser([RoleName.TRAINING_ADMIN]);
    expect(visibilityWhere(user)).toEqual({});
  });

  it('lets System Admin see all courses', () => {
    const user = buildUser([RoleName.SYSTEM_ADMIN]);
    expect(visibilityWhere(user)).toEqual({});
  });

  it('scopes Learner to published courses only', () => {
    const user = buildUser([RoleName.LEARNER]);
    expect(visibilityWhere(user)).toEqual({ status: CourseStatus.PUBLISHED });
  });

  it('falls back to published courses when the user has no recognized roles', () => {
    const user = buildUser([]);
    expect(visibilityWhere(user)).toEqual({ status: CourseStatus.PUBLISHED });
  });

  it('composes a requested status filter with the scope via AND', () => {
    const user = buildUser([RoleName.COURSE_OWNER]);
    expect(visibilityWhere(user, CourseStatus.DRAFT)).toEqual({
      AND: [{ owners: { some: { userId: user.id } } }, { status: CourseStatus.DRAFT }],
    });
  });

  it('composes a requested status filter for broad staff roles', () => {
    const user = buildUser([RoleName.TRAINING_ADMIN]);
    expect(visibilityWhere(user, CourseStatus.PENDING_APPROVAL)).toEqual({
      status: CourseStatus.PENDING_APPROVAL,
    });
  });
});
