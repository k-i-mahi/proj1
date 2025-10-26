/**
 * Data Validation Utilities
 * Provides comprehensive validation for frontend-backend data consistency
 */

// Schema definitions for different data types
const schemas = {
  user: {
    _id: { type: 'string', required: true },
    name: { type: 'string', required: true, minLength: 2, maxLength: 100 },
    email: { type: 'string', required: true, pattern: /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/ },
    role: { type: 'string', required: true, enum: ['resident', 'authority', 'admin'] },
    isActive: { type: 'boolean', default: true },
    location: {
      type: 'object',
      required: true,
      properties: {
        latitude: { type: 'number', min: -90, max: 90 },
        longitude: { type: 'number', min: -180, max: 180 },
        address: { type: 'string', maxLength: 200 }
      }
    },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true }
  },

  issue: {
    _id: { type: 'string', required: true },
    title: { type: 'string', required: true, minLength: 5, maxLength: 200 },
    description: { type: 'string', required: true, minLength: 10, maxLength: 2000 },
    status: { type: 'string', required: true, enum: ['open', 'in-progress', 'resolved', 'closed', 'rejected'] },
    priority: { type: 'string', required: true, enum: ['low', 'medium', 'high', 'urgent'] },
    category: { type: 'string', required: true },
    location: {
      type: 'object',
      required: true,
      properties: {
        type: { type: 'string', enum: ['Point'] },
        coordinates: { type: 'array', length: 2 },
        address: { type: 'string', maxLength: 200 }
      }
    },
    reportedBy: { type: 'string', required: true },
    assignedTo: { type: 'string', required: false },
    images: { type: 'array', default: [] },
    tags: { type: 'array', default: [] },
    isPublic: { type: 'boolean', default: true },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true }
  },

  category: {
    _id: { type: 'string', required: true },
    name: { type: 'string', required: true, minLength: 2, maxLength: 50, pattern: /^[a-z0-9-]+$/ },
    displayName: { type: 'string', required: true, minLength: 2, maxLength: 50 },
    description: { type: 'string', maxLength: 500 },
    icon: { type: 'string', maxLength: 10 },
    color: { type: 'string', pattern: /^#[0-9A-Fa-f]{6}$/ },
    order: { type: 'number', min: 0, default: 0 },
    isActive: { type: 'boolean', default: true },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true }
  },

  notification: {
    _id: { type: 'string', required: true },
    user: { type: 'string', required: true },
    type: { type: 'string', required: true, enum: ['issue_update', 'comment', 'assignment', 'system'] },
    title: { type: 'string', required: true, maxLength: 100 },
    message: { type: 'string', required: true, maxLength: 500 },
    isRead: { type: 'boolean', default: false },
    data: { type: 'object', default: {} },
    createdAt: { type: 'string', required: true }
  }
};

/**
 * Validate a single value against a schema property
 */
const validateProperty = (value, schema, path = '') => {
  const errors = [];

  // Handle required fields
  if (schema.required && (value === undefined || value === null || value === '')) {
    errors.push(`${path} is required`);
    return errors;
  }

  // Skip validation if value is undefined/null and not required
  if (value === undefined || value === null) {
    return errors;
  }

  // Type validation
  if (schema.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== schema.type) {
      errors.push(`${path} must be of type ${schema.type}, got ${actualType}`);
      return errors;
    }
  }

  // String validations
  if (schema.type === 'string' && typeof value === 'string') {
    if (schema.minLength && value.length < schema.minLength) {
      errors.push(`${path} must be at least ${schema.minLength} characters`);
    }
    if (schema.maxLength && value.length > schema.maxLength) {
      errors.push(`${path} must be at most ${schema.maxLength} characters`);
    }
    if (schema.pattern && !schema.pattern.test(value)) {
      errors.push(`${path} format is invalid`);
    }
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`${path} must be one of: ${schema.enum.join(', ')}`);
    }
  }

  // Number validations
  if (schema.type === 'number' && typeof value === 'number') {
    if (schema.min !== undefined && value < schema.min) {
      errors.push(`${path} must be at least ${schema.min}`);
    }
    if (schema.max !== undefined && value > schema.max) {
      errors.push(`${path} must be at most ${schema.max}`);
    }
  }

  // Array validations
  if (schema.type === 'array' && Array.isArray(value)) {
    if (schema.length !== undefined && value.length !== schema.length) {
      errors.push(`${path} must have exactly ${schema.length} items`);
    }
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path} must have at least ${schema.minLength} items`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${path} must have at most ${schema.maxLength} items`);
    }
  }

  // Object validations
  if (schema.type === 'object' && typeof value === 'object' && !Array.isArray(value)) {
    if (schema.properties) {
      Object.keys(schema.properties).forEach(key => {
        const propErrors = validateProperty(value[key], schema.properties[key], `${path}.${key}`);
        errors.push(...propErrors);
      });
    }
  }

  return errors;
};

/**
 * Validate an object against a schema
 */
const validateObject = (data, schemaName) => {
  const schema = schemas[schemaName];
  if (!schema) {
    return {
      isValid: false,
      errors: [`Unknown schema: ${schemaName}`]
    };
  }

  const errors = [];

  // Validate each property in the schema
  Object.keys(schema).forEach(key => {
    const propErrors = validateProperty(data[key], schema[key], key);
    errors.push(...propErrors);
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate API response structure
 */
const validateApiResponse = (response, expectedDataType = null) => {
  const errors = [];

  // Check basic response structure
  if (!response || typeof response !== 'object') {
    errors.push('Response must be an object');
    return { isValid: false, errors };
  }

  // Check for success property
  if (typeof response.success !== 'boolean') {
    errors.push('Response must have a boolean success property');
  }

  // If successful, validate data structure
  if (response.success) {
    if (response.data === undefined) {
      errors.push('Successful response must have data property');
    } else if (expectedDataType && response.data) {
      // Validate data against schema if provided
      if (Array.isArray(response.data)) {
        response.data.forEach((item, index) => {
          const validation = validateObject(item, expectedDataType);
          if (!validation.isValid) {
            errors.push(`Item ${index}: ${validation.errors.join(', ')}`);
          }
        });
      } else {
        const validation = validateObject(response.data, expectedDataType);
        if (!validation.isValid) {
          errors.push(`Data: ${validation.errors.join(', ')}`);
        }
      }
    }
  } else {
    // If not successful, should have error message
    if (!response.message || typeof response.message !== 'string') {
      errors.push('Failed response must have a string message property');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate pagination object
 */
const validatePagination = (pagination) => {
  const errors = [];

  if (!pagination || typeof pagination !== 'object') {
    return { isValid: true, errors: [] }; // Pagination is optional
  }

  const requiredProps = ['page', 'limit', 'total', 'totalPages'];
  requiredProps.forEach(prop => {
    if (typeof pagination[prop] !== 'number' || pagination[prop] < 0) {
      errors.push(`Pagination ${prop} must be a non-negative number`);
    }
  });

  // Logical validations
  if (pagination.page > pagination.totalPages && pagination.totalPages > 0) {
    errors.push('Current page cannot exceed total pages');
  }

  if (pagination.limit <= 0) {
    errors.push('Limit must be greater than 0');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate form data before submission
 */
const validateFormData = (data, schemaName, customValidations = {}) => {
  const baseValidation = validateObject(data, schemaName);
  const errors = [...baseValidation.errors];

  // Apply custom validations
  Object.keys(customValidations).forEach(field => {
    const customValidator = customValidations[field];
    const value = data[field];
    
    try {
      const customResult = customValidator(value, data);
      if (customResult && typeof customResult === 'string') {
        errors.push(`${field}: ${customResult}`);
      } else if (customResult && Array.isArray(customResult)) {
        errors.push(...customResult.map(err => `${field}: ${err}`));
      }
    } catch (error) {
      console.error(`Custom validation error for ${field}:`, error);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Data consistency checker
 */
const checkDataConsistency = (frontendData, backendData, schemaName) => {
  const issues = [];

  // Check if both datasets exist
  if (!frontendData && !backendData) {
    return { isConsistent: true, issues: [] };
  }

  if (!frontendData || !backendData) {
    issues.push('Data exists in one source but not the other');
    return { isConsistent: false, issues };
  }

  // Validate both against schema
  const frontendValidation = validateObject(frontendData, schemaName);
  const backendValidation = validateObject(backendData, schemaName);

  if (!frontendValidation.isValid) {
    issues.push(`Frontend data validation failed: ${frontendValidation.errors.join(', ')}`);
  }

  if (!backendValidation.isValid) {
    issues.push(`Backend data validation failed: ${backendValidation.errors.join(', ')}`);
  }

  // Compare key fields
  const schema = schemas[schemaName];
  if (schema) {
    Object.keys(schema).forEach(key => {
      if (schema[key].required || (frontendData[key] !== undefined && backendData[key] !== undefined)) {
        if (JSON.stringify(frontendData[key]) !== JSON.stringify(backendData[key])) {
          issues.push(`Field '${key}' differs between frontend and backend`);
        }
      }
    });
  }

  return {
    isConsistent: issues.length === 0,
    issues
  };
};

/**
 * Sanitize data before sending to backend
 */
const sanitizeData = (data, schemaName) => {
  const schema = schemas[schemaName];
  if (!schema) {
    return data;
  }

  const sanitized = {};

  Object.keys(schema).forEach(key => {
    const value = data[key];
    const schemaProperty = schema[key];

    if (value !== undefined) {
      // Apply default values
      if (value === null || value === '') {
        if (schemaProperty.default !== undefined) {
          sanitized[key] = schemaProperty.default;
        } else if (schemaProperty.required) {
          sanitized[key] = value; // Keep null/empty for validation to catch
        }
      } else {
        // Type coercion
        if (schemaProperty.type === 'number' && typeof value === 'string') {
          const numValue = Number(value);
          sanitized[key] = isNaN(numValue) ? value : numValue;
        } else if (schemaProperty.type === 'boolean' && typeof value === 'string') {
          sanitized[key] = value === 'true';
        } else if (schemaProperty.type === 'string' && typeof value !== 'string') {
          sanitized[key] = String(value);
        } else {
          sanitized[key] = value;
        }
      }
    } else if (schemaProperty.default !== undefined) {
      sanitized[key] = schemaProperty.default;
    }
  });

  return sanitized;
};

/**
 * Create a validation middleware for API responses
 */
const createValidationMiddleware = (expectedDataType) => {
  return (response) => {
    const validation = validateApiResponse(response, expectedDataType);
    
    if (!validation.isValid) {
      console.warn('API Response validation failed:', validation.errors);
    }

    // Also validate pagination if present
    if (response.pagination) {
      const paginationValidation = validatePagination(response.pagination);
      if (!paginationValidation.isValid) {
        console.warn('Pagination validation failed:', paginationValidation.errors);
      }
    }

    return response;
  };
};

/**
 * Utility to extract errors from API responses
 */
const extractApiErrors = (error) => {
  if (error.response?.data?.errors) {
    return Array.isArray(error.response.data.errors) 
      ? error.response.data.errors 
      : [error.response.data.errors];
  }
  
  if (error.response?.data?.message) {
    return [error.response.data.message];
  }
  
  if (error.message) {
    return [error.message];
  }
  
  return ['An unknown error occurred'];
};

/**
 * Data integrity checker for critical operations
 */
const checkDataIntegrity = async (dataService, operations = []) => {
  const results = [];

  for (const operation of operations) {
    try {
      const { name, check } = operation;
      const result = await check(dataService);
      
      results.push({
        name,
        passed: true,
        result
      });
    } catch (error) {
      results.push({
        name: operation.name,
        passed: false,
        error: error.message
      });
    }
  }

  return {
    allPassed: results.every(r => r.passed),
    results
  };
};

export {
  schemas,
  validateObject,
  validateApiResponse,
  validatePagination,
  validateFormData,
  checkDataConsistency,
  sanitizeData,
  createValidationMiddleware,
  extractApiErrors,
  checkDataIntegrity
};

const dataValidationUtils = {
  schemas,
  validateObject,
  validateApiResponse,
  validatePagination,
  validateFormData,
  checkDataConsistency,
  sanitizeData,
  createValidationMiddleware,
  extractApiErrors,
  checkDataIntegrity
};

export default dataValidationUtils;