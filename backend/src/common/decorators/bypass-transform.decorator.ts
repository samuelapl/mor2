import { SetMetadata } from '@nestjs/common';

export const BYPASS_TRANSFORM_KEY = 'BYPASS_TRANSFORM_KEY';

/**
 * Decorator to bypass the global TransformInterceptor.
 * Useful for endpoints that directly stream binary content (e.g. PDFs, CSVs, files)
 * or need to emit raw unformatted responses.
 */
export const BypassTransform = () => SetMetadata(BYPASS_TRANSFORM_KEY, true);

