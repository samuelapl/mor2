import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';
import { BYPASS_TRANSFORM_KEY } from '@common/decorators/bypass-transform.decorator';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    interceptor = new TransformInterceptor(reflector);
  });

  const createMockContext = (headersSent = false) => {
    const mockResponse = { headersSent, writableEnded: false };
    return {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  const createCallHandler = (data: any): CallHandler => ({
    handle: () => of(data),
  });

  it('wraps a single entity into { success: true, data, timestamp }', (done) => {
    const ctx = createMockContext();
    const handler = createCallHandler({ id: '123', name: 'Test Course' });

    interceptor.intercept(ctx, handler).subscribe((res) => {
      expect(res.success).toBe(true);
      expect(res.data).toEqual({ id: '123', name: 'Test Course' });
      expect(typeof res.timestamp).toBe('string');
      done();
    });
  });

  it('unwraps a paginated response without double wrapping', (done) => {
    const ctx = createMockContext();
    const paginatedInput = {
      data: [{ id: '1' }, { id: '2' }],
      meta: {
        total: 50,
        page: 1,
        limit: 10,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: false,
      },
    };
    const handler = createCallHandler(paginatedInput);

    interceptor.intercept(ctx, handler).subscribe((res) => {
      expect(res.success).toBe(true);
      expect(res.data).toEqual([{ id: '1' }, { id: '2' }]);
      expect(res.meta).toEqual(paginatedInput.meta);
      expect(res.total).toBe(50);
      expect(res.items).toEqual([{ id: '1' }, { id: '2' }]);
      expect(typeof res.timestamp).toBe('string');
      // Verify no double-wrapping: res.data is NOT { data: [...], meta: ... }
      expect(Array.isArray(res.data)).toBe(true);
      done();
    });
  });

  it('normalizes legacy items pagination { items: [...], total, page, limit }', (done) => {
    const ctx = createMockContext();
    const legacyInput = {
      items: [{ id: 'cert-1' }],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    };
    const handler = createCallHandler(legacyInput);

    interceptor.intercept(ctx, handler).subscribe((res) => {
      expect(res.success).toBe(true);
      expect(res.data).toEqual([{ id: 'cert-1' }]);
      expect(res.items).toEqual([{ id: 'cert-1' }]);
      expect(res.meta.total).toBe(1);
      expect(res.meta.totalPages).toBe(1);
      expect(res.total).toBe(1);
      done();
    });
  });

  it('handles null and undefined values cleanly', (done) => {
    const ctx = createMockContext();
    const handler = createCallHandler(null);

    interceptor.intercept(ctx, handler).subscribe((res) => {
      expect(res.success).toBe(true);
      expect(res.data).toBeNull();
      expect(typeof res.timestamp).toBe('string');
      done();
    });
  });

  it('bypasses transformation when @BypassTransform is set', (done) => {
    const ctx = createMockContext();
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === BYPASS_TRANSFORM_KEY) return true;
      return false;
    });

    const rawBuffer = Buffer.from('%PDF-1.4 mock content');
    const handler = createCallHandler(rawBuffer);

    interceptor.intercept(ctx, handler).subscribe((res) => {
      expect(res).toBe(rawBuffer);
      expect(res.success).toBeUndefined();
      done();
    });
  });

  it('bypasses transformation when headersSent is true', (done) => {
    const ctx = createMockContext(true);
    const rawData = 'already sent';
    const handler = createCallHandler(rawData);

    interceptor.intercept(ctx, handler).subscribe((res) => {
      expect(res).toBe('already sent');
      done();
    });
  });
});

