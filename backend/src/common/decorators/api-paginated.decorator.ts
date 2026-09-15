import { applyDecorators, Type } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, getSchemaPath } from '@nestjs/swagger';

export function ApiPaginatedResponse<T extends Type>(itemDto: T) {
  return applyDecorators(
    ApiOkResponse({
      schema: {
        properties: {
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(itemDto) },
          },
          meta: {
            type: 'object',
            properties: {
              total: { type: 'number' },
              page: { type: 'number' },
              limit: { type: 'number' },
              totalPages: { type: 'number' },
              hasNextPage: { type: 'boolean' },
              hasPreviousPage: { type: 'boolean' },
            },
          },
        },
      },
    }),
    ApiQuery({ name: 'page', required: false, type: Number }),
    ApiQuery({ name: 'limit', required: false, type: Number }),
    ApiQuery({ name: 'search', required: false, type: String }),
    ApiQuery({ name: 'sortBy', required: false, type: String }),
    ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] }),
  );
}
