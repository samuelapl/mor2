import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { BYPASS_TRANSFORM_KEY } from '@common/decorators/bypass-transform.decorator';
import { PaginationMeta } from '@common/interfaces';

export interface StandardSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface StandardPaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  items: T[];
  timestamp: string;
}

export type ResponseFormat<T> = StandardSuccessResponse<T> | StandardPaginatedResponse<any>;

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  constructor(@Optional() private readonly reflector?: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 1. Check if handler or controller is marked with @BypassTransform()
    if (this.reflector) {
      const bypass = this.reflector.getAllAndOverride<boolean>(BYPASS_TRANSFORM_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (bypass) {
        return next.handle();
      }
    }

    // 2. Check if the response was already sent or closed (e.g. streaming, custom headers)
    const http = context.switchToHttp();
    const res = http.getResponse();
    if (res && (res.headersSent || res.writableEnded)) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // Double-check if headers were written during execution
        if (res && (res.headersSent || res.writableEnded)) {
          return data;
        }

        const timestamp = new Date().toISOString();

        // Pass-through if already wrapped
        if (data && typeof data === 'object' && 'success' in data && 'timestamp' in data) {
          return data;
        }

        // Handle null / undefined / void
        if (data === null || data === undefined) {
          return {
            success: true,
            data: null,
            timestamp,
          };
        }

        // 3. Detect and normalize paginated responses without double-wrapping
        // Case A: { data: T[], meta: PaginationMeta }
        if (data && typeof data === 'object' && Array.isArray(data.data) && data.meta) {
          const {
            data: items,
            meta,
            total: _t,
            page: _p,
            limit: _l,
            totalPages: _tp,
            items: _i,
            ...rest
          } = data;
          const paginationMeta: PaginationMeta = meta;
          return {
            success: true,
            data: items,
            meta: paginationMeta,
            total: paginationMeta.total,
            page: paginationMeta.page,
            limit: paginationMeta.limit,
            totalPages: paginationMeta.totalPages,
            items,
            ...rest,
            timestamp,
          };
        }

        // Case B: { items: T[], total: number, page: number, limit: number, totalPages?: number }
        if (
          data &&
          typeof data === 'object' &&
          Array.isArray(data.items) &&
          typeof data.total === 'number'
        ) {
          const items = data.items;
          const total = data.total;
          const page = Number(data.page) || 1;
          const limit = Number(data.limit) || items.length || 10;
          const totalPages = Number(data.totalPages) || Math.ceil(total / limit);
          const meta: PaginationMeta = {
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          };

          return {
            success: true,
            data: items,
            meta,
            total,
            page,
            limit,
            totalPages,
            items,
            timestamp,
          };
        }

        // Case C: { data: T[], total: number, page: number, limit: number, totalPages?: number } (legacy flat)
        if (
          data &&
          typeof data === 'object' &&
          Array.isArray(data.data) &&
          typeof data.total === 'number' &&
          typeof data.page === 'number'
        ) {
          const items = data.data;
          const total = data.total;
          const page = Number(data.page) || 1;
          const limit = Number(data.limit) || items.length || 10;
          const totalPages = Number(data.totalPages) || Math.ceil(total / limit);
          const meta: PaginationMeta = {
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          };

          return {
            success: true,
            data: items,
            meta,
            total,
            page,
            limit,
            totalPages,
            items,
            timestamp,
          };
        }

        // 4. Default: standard success wrap
        return {
          success: true,
          data,
          timestamp,
        };
      }),
    );
  }
}
