"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const shared_1 = require("@magents/shared");
const errorHandler = async (err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_next) => {
    // Generate unique request ID for error tracking
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    // Convert to MagentsError if needed
    let magentsError;
    if (err instanceof shared_1.MagentsError) {
        magentsError = err;
    }
    else {
        magentsError = (0, shared_1.createMagentsErrorFromGeneric)(err, undefined, {
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
    let autoFixSuggestions = {};
    if (magentsError.autoFixAvailable) {
        try {
            autoFixAttempted = await (0, shared_1.attemptAutoFix)(magentsError);
            if (autoFixAttempted && magentsError.context) {
                autoFixSuggestions = {
                    suggestedName: magentsError.context.suggestedName,
                    suggestedPort: magentsError.context.suggestedPort
                };
            }
        }
        catch (autoFixError) {
            console.warn('Auto-fix attempt failed:', autoFixError);
        }
    }
    // Determine HTTP status code based on error severity and category
    let statusCode;
    switch (magentsError.severity) {
        case shared_1.ErrorSeverity.LOW:
            statusCode = 400;
            break;
        case shared_1.ErrorSeverity.MEDIUM:
            statusCode = magentsError.code.includes('NOT_FOUND') ? 404 :
                magentsError.code.includes('ALREADY_EXISTS') ? 409 : 400;
            break;
        case shared_1.ErrorSeverity.HIGH:
            statusCode = 422;
            break;
        case shared_1.ErrorSeverity.CRITICAL:
            statusCode = 503;
            break;
        default:
            statusCode = 500;
    }
    // Create enhanced response
    const response = {
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
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map