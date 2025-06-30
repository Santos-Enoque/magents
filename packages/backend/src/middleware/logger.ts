import { Request, Response, NextFunction } from 'express';
import { formatLogMessage } from '@magents/shared';

export const logger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, url, ip } = req;
  
  // Log request
  console.log(formatLogMessage('info', `${method} ${url}`, { ip, userAgent: req.get('User-Agent') }));
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const level = statusCode >= 400 ? 'error' : 'info';
    
    console.log(formatLogMessage(level, `${method} ${url} - ${statusCode}`, { 
      duration: `${duration}ms`,
      ip,
      statusCode
    }));
  });
  
  next();
};