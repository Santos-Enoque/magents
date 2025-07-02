import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@magents/shared';
import { MagentsError, createMagentsErrorFromGeneric, ErrorSeverity, attemptAutoFix } from '@magents/shared';

export interface EnhancedApiResponse {
  success: boolean;
  message: string;
  error: {
    code: string;
    userMessage: string;
    suggestions: string[];
    severity: string;
    recoverable: boolean;
    autoFixAttempted?: boolean;
    autoFixSuggestions?: Record<string, any>;
    learnMoreUrl?: string;
    requestId?: string;
  };
}

export const errorHandler = async (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  // Generate unique request ID for error tracking
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  
  // Convert to MagentsError if needed
  let magentsError: MagentsError;
  if (err instanceof MagentsError) {
    magentsError = err;
  } else {
    magentsError = createMagentsErrorFromGeneric(err, undefined, {
      requestId,
      endpoint: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  }

  // Log error with enhanced context
  console.error('=== Enhanced Error Report ===');
  console.error('Request ID:', requestId);
  console.error('Endpoint:', `${req.method} ${req.path}`);
  console.error('User Agent:', req.get('User-Agent'));
  console.error('Error Code:', magentsError.code);
  console.error('Severity:', magentsError.severity);
  console.error('Category:', magentsError.category);
  console.error('User Message:', magentsError.userMessage);
  console.error('Technical Message:', magentsError.technicalMessage);
  console.error('Context:', JSON.stringify(magentsError.context, null, 2));
  console.error('Stack:', magentsError.stack);
  console.error('=== End Error Report ===');

  // Attempt auto-fix if available
  let autoFixAttempted = false;
  let autoFixSuggestions: Record<string, any> = {};
  
  if (magentsError.autoFixAvailable) {
    try {
      autoFixAttempted = await attemptAutoFix(magentsError);
      if (autoFixAttempted && magentsError.context) {
        autoFixSuggestions = {
          suggestedName: magentsError.context.suggestedName,
          suggestedPort: magentsError.context.suggestedPort
        };
      }
    } catch (autoFixError) {
      console.warn('Auto-fix attempt failed:', autoFixError);
    }
  }

  // Determine HTTP status code based on error severity and category
  let statusCode: number;
  switch (magentsError.severity) {
    case ErrorSeverity.LOW:
      statusCode = 400;
      break;
    case ErrorSeverity.MEDIUM:
      statusCode = magentsError.code.includes('NOT_FOUND') ? 404 : 
                   magentsError.code.includes('ALREADY_EXISTS') ? 409 : 400;
      break;
    case ErrorSeverity.HIGH:
      statusCode = 422;
      break;
    case ErrorSeverity.CRITICAL:
      statusCode = 503;
      break;
    default:
      statusCode = 500;
  }

  // Create enhanced response
  const response: EnhancedApiResponse = {
    success: false,
    message: magentsError.userMessage,
    error: {
      code: magentsError.code,
      userMessage: magentsError.userMessage,
      suggestions: magentsError.suggestions,
      severity: magentsError.severity,
      recoverable: magentsError.recoverable,
      autoFixAttempted,
      autoFixSuggestions: Object.keys(autoFixSuggestions).length > 0 ? autoFixSuggestions : undefined,
      learnMoreUrl: magentsError.learnMoreUrl,
      requestId
    }
  };

  res.status(statusCode).json(response);
};