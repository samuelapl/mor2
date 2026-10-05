import { SetMetadata } from '@nestjs/common';
import { IS_OPTIONAL_AUTH_KEY } from '@config/constants';

// Route is open to anonymous callers, but a valid Bearer token (when sent) still
// populates @CurrentUser() — e.g. so public news can return the caller's own reaction.
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH_KEY, true);
