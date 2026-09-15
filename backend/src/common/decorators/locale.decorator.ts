import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { LOCALE, Locale } from '@config/constants';

export const UserLocale = createParamDecorator((data: unknown, ctx: ExecutionContext): Locale => {
  const request = ctx.switchToHttp().getRequest();
  const queryLocale = request.query?.locale as string | undefined;
  const headerLocale = request.headers?.['accept-language'] as string | undefined;

  const locale = queryLocale || headerLocale;
  if (locale && [LOCALE.EN, LOCALE.AM].includes(locale as Locale)) {
    return locale as Locale;
  }
  return LOCALE.EN;
});
