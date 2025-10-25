
import {
  authService,
  issueService,
  categoryService,
  notificationService,
  activityService,
  interactionService,
  locationService,
  userService,
} from '../services';

/**
 * Test all service endpoints
 * @returns {Object} Test results
 */
export const testAllServices = async () => {
  const results = {
    auth: {},
    issue: {},
    category: {},
    notification: {},
    activity: {},
    interaction: {},
    location: {},
    user: {},
  };

  console.log('🧪 Starting service tests...');

  // Test Auth Service
  try {
    results.auth.isAuthenticated = authService.isAuthenticated() ? '✅' : '❌';
    results.auth.getToken = authService.getToken() ? '✅' : '❌';
    results.auth.methods = Object.keys(authService).length;
  } catch (error) {
    results.auth.error = error.message;
  }

  // Test Issue Service  
  try {
    results.issue.methods = Object.keys(issueService).length;
    results.issue.helpers = [
      'formatIssue',
      'validateIssue',
      'canEdit',
      'canDelete',
    ].every((m) => typeof issueService[m] === 'function') ? '✅' : '❌';
  } catch (error) {
    results.issue.error = error.message;
  }

  // Test Category Service
  try {
    results.category.methods = Object.keys(categoryService).length;
    results.category.validation = typeof categoryService.validateCategory === 'function' ? '✅' : '❌';
  } catch (error) {
    results.category.error = error.message;
  }

  // Test Notification Service
  try {
    results.notification.methods = Object.keys(notificationService).length;
    results.notification.formatting = typeof notificationService.formatNotification === 'function' ? '✅' : '❌';
  } catch (error) {
    results.notification.error = error.message;
  }

  // Test Activity Service
  try {
    results.activity.methods = Object.keys(activityService).length;
    results.activity.types = activityService.getActivityTypes ? '✅' : '❌';
  } catch (error) {
    results.activity.error = error.message;
  }

  // Test Interaction Service
  try {
    results.interaction.methods = Object.keys(interactionService).length;
    results.interaction.voting = ['upvote', 'downvote', 'removeVote'].every(
      (m) => typeof interactionService[m] === 'function'
    ) ? '✅' : '❌';
  } catch (error) {
    results.interaction.error = error.message;
  }

  // Test Location Service
  try {
    results.location.methods = Object.keys(locationService).length;
    results.location.geolocation = typeof locationService.getCurrentPosition === 'function' ? '✅' : '❌';
    results.location.calculations = typeof locationService.calculateDistanceLocal === 'function' ? '✅' : '❌';
  } catch (error) {
    results.location.error = error.message;
  }

  // Test User Service
  try {
    results.user.methods = Object.keys(userService).length;
    results.user.crud = ['getUsers', 'getUserById', 'updateUser', 'deleteUser'].every(
      (m) => typeof userService[m] === 'function'
    ) ? '✅' : '❌';
  } catch (error) {
    results.user.error = error.message;
  }

  return results;
};

/**
 * Log test results
 * @param {Object} results - Test results
 */
export const logTestResults = (results) => {
  console.group('🧪 Service Test Results');
  
  Object.entries(results).forEach(([service, data]) => {
    console.group(`📦 ${service.toUpperCase()} Service`);
    Object.entries(data).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });
    console.groupEnd();
  });

  console.groupEnd();
};

/**
 * Run all tests
 */
export const runServiceTests = async () => {
  const results = await testAllServices();
  logTestResults(results);
  return results;
};