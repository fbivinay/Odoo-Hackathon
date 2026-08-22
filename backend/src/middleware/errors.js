const { AppError } = require('../lib/errors');

function notFoundHandler(req, res) {
  res.status(404).json({ ok: false, error: 'NOT_FOUND', message: `No route for ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ ok: false, error: err.code, message: err.message });
  }

  if (err.name === 'ZodError') {
    const message = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return res.status(400).json({ ok: false, error: 'VALIDATION_ERROR', message });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({ ok: false, error: 'CONFLICT', message: `Duplicate value for ${err.meta?.target}` });
  }

  console.error(err);
  return res.status(500).json({ ok: false, error: 'INTERNAL_ERROR', message: 'Something went wrong' });
}

module.exports = { notFoundHandler, errorHandler };
