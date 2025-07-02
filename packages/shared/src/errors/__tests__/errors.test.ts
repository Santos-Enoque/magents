/**
 * Tests for Enhanced Error Handling System
 */

import {
  MagentsError,
  ErrorSeverity,
  ErrorCategory,
  createMagentsError,
  createMagentsErrorFromGeneric,
  attemptAutoFix,
  ERROR_MESSAGES
} from '../index';
import { ERROR_CODES } from '../../constants';

describe('Enhanced Error Handling System', () => {
  describe('MagentsError Class', () => {
    it('should create a proper MagentsError instance', () => {
      const error = createMagentsError(ERROR_CODES.AGENT_NOT_FOUND, {
        agentId: 'test-agent'
      });

      expect(error).toBeInstanceOf(MagentsError);
      expect(error.code).toBe(ERROR_CODES.AGENT_NOT_FOUND);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.category).toBe(ErrorCategory.AGENT);
      expect(error.userMessage).toContain("doesn't exist");
      expect(error.suggestions).toHaveLength(4);
      expect(error.recoverable).toBe(true);
      expect(error.context?.agentId).toBe('test-agent');
    });

    it('should serialize to JSON properly', () => {
      const error = createMagentsError(ERROR_CODES.DOCKER_ERROR);
      const json = error.toJSON();

      expect(json.code).toBe(ERROR_CODES.DOCKER_ERROR);
      expect(json.severity).toBe(ErrorSeverity.CRITICAL);
      expect(json.category).toBe(ErrorCategory.DOCKER);
      expect(json.userMessage).toContain('Docker');
      expect(json.timestamp).toBeDefined();
      expect(json.stack).toBeDefined();
    });
  });

  describe('Error Creation Functions', () => {
    it('should create error from known error code', () => {
      const error = createMagentsError(ERROR_CODES.PORT_UNAVAILABLE, {
        requestedPort: 3000
      });

      expect(error.code).toBe(ERROR_CODES.PORT_UNAVAILABLE);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.autoFixAvailable).toBe(true);
      expect(error.context?.requestedPort).toBe(3000);
    });

    it('should create fallback error for unknown code', () => {
      const error = createMagentsError('UNKNOWN_CODE');

      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.userMessage).toContain('unexpected error');
    });

    it('should create error from generic Error object', () => {
      const genericError = new Error('Something went wrong');
      const magentsError = createMagentsErrorFromGeneric(genericError);

      expect(magentsError).toBeInstanceOf(MagentsError);
      expect(magentsError.technicalMessage).toBe('Something went wrong');
      expect(magentsError.context?.originalError).toBe('Something went wrong');
    });

    it('should detect error patterns in generic errors', () => {
      const dockerError = new Error('Docker daemon is not running');
      const magentsError = createMagentsErrorFromGeneric(dockerError);

      expect(magentsError.code).toBe(ERROR_CODES.DOCKER_ERROR);
      expect(magentsError.category).toBe(ErrorCategory.DOCKER);
      expect(magentsError.severity).toBe(ErrorSeverity.CRITICAL);
    });
  });

  describe('Auto-fix Functionality', () => {
    it('should provide auto-fix for agent name conflicts', async () => {
      const error = createMagentsError(ERROR_CODES.AGENT_ALREADY_EXISTS, {
        agentName: 'test-agent'
      });

      const success = await attemptAutoFix(error);

      expect(success).toBe(true);
      expect(error.context?.suggestedName).toContain('test-agent');
      expect(error.context?.suggestedName).not.toBe('test-agent');
    });

    it('should provide auto-fix for port conflicts', async () => {
      const error = createMagentsError(ERROR_CODES.PORT_UNAVAILABLE, {
        requestedPort: 3000
      });

      const success = await attemptAutoFix(error);

      expect(success).toBe(true);
      expect(error.context?.suggestedPort).toBeGreaterThan(3000);
      expect(error.context?.suggestedPort).toBeLessThan(4000);
    });

    it('should return false for non-auto-fixable errors', async () => {
      const error = createMagentsError(ERROR_CODES.PROJECT_NOT_FOUND);

      const success = await attemptAutoFix(error);

      expect(success).toBe(false);
    });
  });

  describe('Error Messages Validation', () => {
    it('should have complete error message definitions', () => {
      // Check that all error codes have corresponding messages
      Object.values(ERROR_CODES).forEach(code => {
        expect(ERROR_MESSAGES[code]).toBeDefined();
        expect(ERROR_MESSAGES[code].userMessage).toBeTruthy();
        expect(ERROR_MESSAGES[code].technicalMessage).toBeTruthy();
        expect(ERROR_MESSAGES[code].suggestions.length).toBeGreaterThan(0);
      });
    });

    it('should have proper severity levels for all error types', () => {
      Object.values(ERROR_MESSAGES).forEach(errorDef => {
        expect(Object.values(ErrorSeverity)).toContain(errorDef.severity);
        expect(Object.values(ErrorCategory)).toContain(errorDef.category);
      });
    });

    it('should have actionable suggestions for all errors', () => {
      Object.values(ERROR_MESSAGES).forEach(errorDef => {
        expect(errorDef.suggestions.length).toBeGreaterThan(0);
        errorDef.suggestions.forEach(suggestion => {
          expect(suggestion.length).toBeGreaterThan(10); // Should be descriptive
          expect(suggestion).not.toContain('TODO'); // Should be complete
        });
      });
    });
  });

  describe('Error Context and Metadata', () => {
    it('should preserve context information', () => {
      const context = {
        agentId: 'test-agent',
        operation: 'create',
        timestamp: new Date().toISOString()
      };

      const error = createMagentsError(ERROR_CODES.AGENT_NOT_FOUND, context);

      expect(error.context).toEqual(expect.objectContaining(context));
    });

    it('should allow context mutations for auto-fix', () => {
      const error = createMagentsError(ERROR_CODES.PORT_UNAVAILABLE);

      // Should be able to modify context
      error.context = { ...error.context, suggestedPort: 3001 };

      expect(error.context.suggestedPort).toBe(3001);
    });

    it('should preserve original error information', () => {
      const originalError = new Error('Original error message');
      originalError.stack = 'Original stack trace';

      const magentsError = createMagentsErrorFromGeneric(originalError, undefined, {
        customContext: 'test'
      });

      expect(magentsError.context?.originalError).toBe('Original error message');
      expect(magentsError.context?.originalStack).toBe('Original stack trace');
      expect(magentsError.context?.customContext).toBe('test');
    });
  });

  describe('Error Severity and Category Mapping', () => {
    it('should assign appropriate severity to critical errors', () => {
      const criticalErrors = [ERROR_CODES.DOCKER_ERROR];
      
      criticalErrors.forEach(code => {
        const error = createMagentsError(code);
        expect(error.severity).toBe(ErrorSeverity.CRITICAL);
      });
    });

    it('should assign appropriate severity to high-priority errors', () => {
      const highErrors = [ERROR_CODES.PROJECT_NOT_FOUND, ERROR_CODES.INVALID_CONFIG];
      
      highErrors.forEach(code => {
        const error = createMagentsError(code);
        expect(error.severity).toBe(ErrorSeverity.HIGH);
      });
    });

    it('should categorize errors correctly', () => {
      const agentErrors = [ERROR_CODES.AGENT_NOT_FOUND, ERROR_CODES.AGENT_ALREADY_EXISTS];
      const systemErrors = [ERROR_CODES.GIT_ERROR, ERROR_CODES.TMUX_ERROR];
      
      agentErrors.forEach(code => {
        const error = createMagentsError(code);
        expect(error.category).toBe(ErrorCategory.AGENT);
      });

      systemErrors.forEach(code => {
        const error = createMagentsError(code);
        expect(error.category).toBe(ErrorCategory.SYSTEM);
      });
    });
  });

  describe('Error Recovery Information', () => {
    it('should mark recoverable errors correctly', () => {
      const recoverableErrors = [
        ERROR_CODES.AGENT_NOT_FOUND,
        ERROR_CODES.PORT_UNAVAILABLE,
        ERROR_CODES.INVALID_CONFIG
      ];

      recoverableErrors.forEach(code => {
        const error = createMagentsError(code);
        expect(error.recoverable).toBe(true);
      });
    });

    it('should identify auto-fixable errors', () => {
      const autoFixableErrors = [
        ERROR_CODES.AGENT_ALREADY_EXISTS,
        ERROR_CODES.PORT_UNAVAILABLE,
        ERROR_CODES.INVALID_CONFIG
      ];

      autoFixableErrors.forEach(code => {
        const error = createMagentsError(code);
        expect(error.autoFixAvailable).toBe(true);
      });
    });
  });
});