class AppError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

const badRequest = (message, code = 'BAD_REQUEST') => new AppError(400, code, message);
const unauthorized = (message = 'Unauthorized', code = 'UNAUTHORIZED') => new AppError(401, code, message);
const forbidden = (message = 'Forbidden', code = 'FORBIDDEN') => new AppError(403, code, message);
const notFound = (message = 'Not found', code = 'NOT_FOUND') => new AppError(404, code, message);
const conflict = (message, code = 'CONFLICT') => new AppError(409, code, message);

module.exports = { AppError, badRequest, unauthorized, forbidden, notFound, conflict };
