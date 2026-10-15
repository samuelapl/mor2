import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './http-exception.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  const createMockHost = (locale = 'en') => {
    const jsonMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    const response = { status: statusMock };
    const request = {
      headers: { 'accept-language': locale },
      query: {},
      url: '/api/v1/test',
    };

    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;

    return { host, statusMock, jsonMock };
  };

  it('formats standard HttpException with success: false', () => {
    const { host, statusMock, jsonMock } = createMockHost();
    const exception = new HttpException('Resource not found', HttpStatus.NOT_FOUND);

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 404,
        error: 'HttpException',
        message: 'Resource not found',
        path: '/api/v1/test',
      }),
    );
  });

  it('normalizes validation errors into string message and details array', () => {
    const { host, statusMock, jsonMock } = createMockHost();
    const validationErrors = ['email must be an email', 'password is too short'];
    const exception = new HttpException(
      {
        statusCode: 400,
        error: 'Bad Request',
        message: validationErrors,
      },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 400,
        error: 'Bad Request',
        message: 'email must be an email; password is too short',
        details: validationErrors,
        path: '/api/v1/test',
      }),
    );
  });

  it('forwards extra properties such as remainingSeconds or reason', () => {
    const { host, jsonMock } = createMockHost();
    const exception = new HttpException(
      {
        statusCode: 403,
        error: 'Forbidden',
        message: 'Time lock active',
        reason: 'TIME_NOT_MET',
        remainingSeconds: 120,
      },
      HttpStatus.FORBIDDEN,
    );

    filter.catch(exception, host);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 403,
        reason: 'TIME_NOT_MET',
        remainingSeconds: 120,
      }),
    );
  });
});

