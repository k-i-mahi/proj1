// Central export file for all services

// Core API
export { default as api } from './api';
export * from './api';

// Service modules
export { default as authService } from './authService';
export { default as userService } from './userService';
export { default as issueService } from './issueService';
export { default as categoryService } from './categoryService';
export { default as notificationService } from './notificationService';
export { default as activityService } from './activityService';
export { default as interactionService } from './interactionService';
export { default as locationService } from './locationService';

// API Configuration
export { API_ENDPOINTS, buildApiUrl } from '../config/api.config';
export { default as apiConfig } from '../config/api.config';

// Validation utility
export { validateServices } from '../utils/serviceValidator';

// Service health check
export const checkServiceHealth = async () => {
  try {
    const { api } = await import('./api');
    const response = await api.get('/health');
    return {
      healthy: true,
      data: response.data,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
    };
  }
};

// Initialize all services
export const initializeServices = async () => {
  console.log('🚀 Initializing Civita Services...');
  
  try {
    // Check backend connectivity
    const health = await checkServiceHealth();
    
    if (health.healthy) {
      console.log('✅ Backend connected:', health.data.status);
      console.log('📊 Server info:', {
        uptime: health.data.uptime,
        environment: health.data.environment,
        version: health.data.version,
      });
    } else {
      console.error('❌ Backend unreachable:', health.error);
      console.warn('⚠️  Services will run in offline mode');
    }

    // Validate services
    const { validateServices, logValidation } = await import('../utils/serviceValidator');
    const validation = await validateServices();
    logValidation(validation);

    return {
      success: true,
      health,
      validation,
    };
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Export a default object with all services
export default {
  api: require('./api').default,
  auth: require('./authService').default,
  user: require('./userService').default,
  issue: require('./issueService').default,
  category: require('./categoryService').default,
  notification: require('./notificationService').default,
  activity: require('./activityService').default,
  interaction: require('./interactionService').default,
  location: require('./locationService').default,
};