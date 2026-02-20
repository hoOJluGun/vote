'use strict';

/**
 * Input Validation Module for Cognitive Execution Layer
 * Provides comprehensive validation for all API inputs
 *
 * @module src/middleware/input-validator
 */

// ============================================================================
// VALIDATION ERROR CLASS
// ============================================================================

/**
 * Validation error with detailed information
 */
class ValidationError extends Error {
  /**
   * Create a ValidationError
   * @param {string} message - Error message
   * @param {string} [field] - Field that failed validation
   * @param {*} [value] - Value that failed validation
   * @param {string} [code] - Error code
   */
  constructor(message, field = null, value = null, code = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    this.code = code;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Convert to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      error: this.name,
      message: this.message,
      field: this.field,
      code: this.code,
      timestamp: this.timestamp,
    };
  }
}

// ============================================================================
// INPUT VALIDATOR CLASS
// ============================================================================

/**
 * Input Validator class with comprehensive validation methods
 */
class InputValidator {
  // Maximum allowed string lengths
  static MAX_STRING_LENGTH = 10000;
  static MAX_CODE_LENGTH = 1000000; // 1MB
  static MAX_PATH_LENGTH = 4096;
  static MAX_ARRAY_LENGTH = 1000;

  // Allowed patterns
  static PATTERNS = {
    FILENAME: /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,255}$/,
    RELATIVE_PATH: /^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,4093}$/,
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    IDENTIFIER: /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/,
  };

  // Dangerous patterns to detect
  static DANGEROUS_PATTERNS = [
    /\.\./,
    /\0/,
    /<script\b/i,
    /javascript:/i,
    /eval\s*\(/i,
    /Function\s*\(/i,
  ];

  /**
   * Validate string input
   * @param {*} value - Value to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  static validateString(value, options = {}) {
    const {
      fieldName = 'value',
      required = true,
      minLength = 0,
      maxLength = this.MAX_STRING_LENGTH,
      pattern = null,
      allowEmpty = false,
    } = options;

    if (value === undefined || value === null) {
      if (required) {
        throw new ValidationError(`${fieldName} is required`, fieldName, null, 'REQUIRED_FIELD');
      }
      return { valid: true, value: null };
    }

    if (typeof value !== 'string') {
      throw new ValidationError(
        `${fieldName} must be a string, got ${typeof value}`,
        fieldName,
        value,
        'INVALID_TYPE',
      );
    }

    if (!allowEmpty && value.length === 0) {
      throw new ValidationError(`${fieldName} cannot be empty`, fieldName, value, 'EMPTY_VALUE');
    }

    if (value.length < minLength) {
      throw new ValidationError(
        `${fieldName} must be at least ${minLength} characters`,
        fieldName,
        value,
        'MIN_LENGTH',
      );
    }

    if (value.length > maxLength) {
      throw new ValidationError(
        `${fieldName} exceeds maximum length of ${maxLength}`,
        fieldName,
        `[${value.length} chars]`,
        'MAX_LENGTH',
      );
    }

    if (pattern && !pattern.test(value)) {
      throw new ValidationError(`${fieldName} has invalid format`, fieldName, value, 'INVALID_FORMAT');
    }

    return { valid: true, value };
  }

  /**
   * Validate numeric input
   * @param {*} value - Value to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  static validateNumber(value, options = {}) {
    const {
      fieldName = 'value',
      required = true,
      min = null,
      max = null,
      integer = false,
      positive = false,
    } = options;

    if (value === undefined || value === null) {
      if (required) {
        throw new ValidationError(`${fieldName} is required`, fieldName, null, 'REQUIRED_FIELD');
      }
      return { valid: true, value: null };
    }

    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (typeof numValue !== 'number' || isNaN(numValue)) {
      throw new ValidationError(`${fieldName} must be a valid number`, fieldName, value, 'INVALID_NUMBER');
    }

    if (integer && !Number.isInteger(numValue)) {
      throw new ValidationError(`${fieldName} must be an integer`, fieldName, value, 'NOT_INTEGER');
    }

    if (positive && numValue <= 0) {
      throw new ValidationError(`${fieldName} must be positive`, fieldName, value, 'NOT_POSITIVE');
    }

    if (min !== null && numValue < min) {
      throw new ValidationError(`${fieldName} must be at least ${min}`, fieldName, value, 'MIN_VALUE');
    }

    if (max !== null && numValue > max) {
      throw new ValidationError(`${fieldName} must be at most ${max}`, fieldName, value, 'MAX_VALUE');
    }

    return { valid: true, value: numValue };
  }

  /**
   * Validate array input
   * @param {*} value - Value to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  static validateArray(value, options = {}) {
    const {
      fieldName = 'value',
      required = true,
      minLength = 0,
      maxLength = this.MAX_ARRAY_LENGTH,
    } = options;

    if (value === undefined || value === null) {
      if (required) {
        throw new ValidationError(`${fieldName} is required`, fieldName, null, 'REQUIRED_FIELD');
      }
      return { valid: true, value: null };
    }

    if (!Array.isArray(value)) {
      throw new ValidationError(`${fieldName} must be an array`, fieldName, value, 'INVALID_TYPE');
    }

    if (value.length < minLength) {
      throw new ValidationError(
        `${fieldName} must have at least ${minLength} items`,
        fieldName,
        value,
        'MIN_LENGTH',
      );
    }

    if (value.length > maxLength) {
      throw new ValidationError(
        `${fieldName} exceeds maximum of ${maxLength} items`,
        fieldName,
        `[${value.length} items]`,
        'MAX_LENGTH',
      );
    }

    return { valid: true, value };
  }

  /**
   * Validate object input
   * @param {*} value - Value to validate
   * @param {Object} schema - Validation schema
   * @returns {Object} Validation result
   */
  static validateObject(value, schema = {}) {
    const {
      fieldName = 'value',
      required = true,
      properties = {},
    } = schema;

    if (value === undefined || value === null) {
      if (required) {
        throw new ValidationError(`${fieldName} is required`, fieldName, null, 'REQUIRED_FIELD');
      }
      return { valid: true, value: null };
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new ValidationError(`${fieldName} must be an object`, fieldName, value, 'INVALID_TYPE');
    }

    const validatedObject = {};
    for (const [propName, propSchema] of Object.entries(properties)) {
      const propValue = value[propName];
      const result = this.validateProperty(propValue, propSchema, propName);
      if (result.value !== undefined) {
        validatedObject[propName] = result.value;
      }
    }

    return { valid: true, value: validatedObject };
  }

  /**
   * Validate a single property based on schema
   * @param {*} value - Property value
   * @param {Object} schema - Property schema
   * @param {string} propName - Property name
   * @returns {Object} Validation result
   */
  static validateProperty(value, schema, propName) {
    const { type, ...options } = schema;
    options.fieldName = propName;

    switch (type) {
      case 'string':
        return this.validateString(value, options);
      case 'number':
        return this.validateNumber(value, options);
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new ValidationError(`${propName} must be a boolean`, propName, value, 'INVALID_TYPE');
        }
        return { valid: true, value };
      case 'array':
        return this.validateArray(value, options);
      case 'object':
        return this.validateObject(value, options);
      case 'enum':
        if (!schema.values.includes(value)) {
          throw new ValidationError(
            `${propName} must be one of: ${schema.values.join(', ')}`,
            propName,
            value,
            'INVALID_ENUM',
          );
        }
        return { valid: true, value };
      default:
        return { valid: true, value };
    }
  }

  /**
   * Create validation middleware for Express
   * @param {Object} schema - Validation schema
   * @returns {Function} Express middleware
   */
  static middleware(schema) {
    return (req, res, next) => {
      try {
        if (schema.body) {
          const result = this.validateObject(req.body, schema.body);
          req.body = result.value;
        }

        if (schema.query) {
          const result = this.validateObject(req.query, schema.query);
          req.query = result.value;
        }

        if (schema.params) {
          const result = this.validateObject(req.params, schema.params);
          req.params = result.value;
        }

        next();
      } catch (error) {
        if (error instanceof ValidationError) {
          res.status(400).json({
            success: false,
            error: error.toJSON(),
          });
        } else {
          next(error);
        }
      }
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  ValidationError,
  InputValidator,
};
