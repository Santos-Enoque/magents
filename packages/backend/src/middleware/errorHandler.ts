import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@magents/shared';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  
  // Default error response
  let statusCode = 500;
  let message = 'Internal server error';
  
  // Handle specific error types
  if (err.message.includes('not found')) {
    statusCode = 404;
    message = err.message;
  } else if (err.message.includes('already exists')) {
    statusCode = 409;
    message = err.message;
  } else if (err.message.includes('invalid') || err.message.includes('cannot be empty')) {
    statusCode = 400;
    message = err.message;
  }
  
  const response: ApiResponse = {
    success: false,
    error: message,
    message: message
  };
  
  res.status(statusCode).json(response);
};