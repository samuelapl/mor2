import { BadRequestException } from '@nestjs/common';
import { CourseDeliveryMode } from '@prisma/client';
import { assertDeliveryModeAllowed } from './delivery-modes';

describe('assertDeliveryModeAllowed', () => {
  it('allows online self-paced for new courses', () => {
    expect(() => assertDeliveryModeAllowed(CourseDeliveryMode.ONLINE_ONLY)).not.toThrow();
  });

  it('refuses in-person and hybrid for new courses', () => {
    expect(() => assertDeliveryModeAllowed(CourseDeliveryMode.IN_PERSON_ONLY)).toThrow(
      BadRequestException,
    );
    expect(() => assertDeliveryModeAllowed(CourseDeliveryMode.BOTH)).toThrow(BadRequestException);
  });

  it('lets an existing course keep the disabled mode it already has', () => {
    expect(() =>
      assertDeliveryModeAllowed(CourseDeliveryMode.BOTH, CourseDeliveryMode.BOTH),
    ).not.toThrow();
  });

  it('does not let an existing course switch to another disabled mode', () => {
    expect(() =>
      assertDeliveryModeAllowed(CourseDeliveryMode.IN_PERSON_ONLY, CourseDeliveryMode.BOTH),
    ).toThrow(BadRequestException);
  });
});
