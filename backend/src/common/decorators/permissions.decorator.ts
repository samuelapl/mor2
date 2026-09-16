import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY } from '@config/constants';

// Required codes are OR'd together — the caller needs at least one.
export const Permissions = (...codes: string[]) => SetMetadata(PERMISSIONS_KEY, codes);
