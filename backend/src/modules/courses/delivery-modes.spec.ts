import { BadRequestException } from '@nestjs/common';
import { CourseDeliveryMode } from '@prisma/client';
import { assertDeliveryModeAllowed } from './delivery-modes';

describe('assertDeliveryModeAllowed', () => {
  it('allows online self-paced and in-person for new courses', () => {
    expect(() => assertDeliveryModeAllowed(CourseDeliveryMode.ONLINE_ONLY)).not.toThrow();
    expect(() => assertDeliveryModeAllowed(CourseDeliveryMode.IN_PERSON_ONLY)).not.toThrow();
  });

  it('refuses hybrid (BOTH) for new courses', () => {
    expect(() => assertDeliveryModeAllowed(CourseDeliveryMode.BOTH)).toThrow(BadRequestException);
  });

  it('lets an existing course keep the disabled mode it already has', () => {
    expect(() =>
      assertDeliveryModeAllowed(CourseDeliveryMode.BOTH, CourseDeliveryMode.BOTH),
    ).not.toThrow();
  });

  it('does not let an existing course switch to a disabled mode', () => {
    expect(() =>
      assertDeliveryModeAllowed(CourseDeliveryMode.BOTH, CourseDeliveryMode.ONLINE_ONLY),
    ).toThrow(BadRequestException);
  });
});
