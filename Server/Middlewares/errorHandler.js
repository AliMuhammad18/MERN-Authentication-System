import AppError from '../utils/AppError.js';

const errorHandler = (err, req, res, next) => {

  // ── Normalize known error types into AppError ──

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message).join(', ');
    err = new AppError(messages, 400);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    err = new AppError(`Invalid ${err.path}: ${err.value}`, 400);
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue).join(', ');
    err = new AppError(`Duplicate value for: ${field}`, 409);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    err = new AppError('Invalid token', 401);
  }
  if (err.name === 'TokenExpiredError') {
    err = new AppError('Token has expired', 401);
  }

  // ── Build response ──

  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;

  // Log unexpected errors with full stack
  if (!isOperational) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}`, err);
  }

  return res.status(statusCode).json({
    success: false,
    message: isOperational ? err.message : 'Internal server error',
  });

};

export default errorHandler;
