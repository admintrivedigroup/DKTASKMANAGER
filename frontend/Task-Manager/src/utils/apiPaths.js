// API base URL must always come from the Vite environment
export const BASE_URL = import.meta.env.VITE_API_URL;

// utils/apiPaths.js
export const API_PATHS = {
  AUTH: {
    REGISTER: "/api/auth/register", // Register a new user (Admin or Member)
    LOGIN: "/api/auth/login",       // Authenticate user & return JWT token
    GET_PROFILE: "/api/auth/profile", // Get logged-in user details
    RESET_WITH_ADMIN_TOKEN: "/api/auth/reset-password/admin-token",    
  },

  USERS: {
    GET_ALL_USERS: "/api/users",                 // Get all users (Admin only)
    GET_USER_BY_ID: (userId) => `/api/users/${userId}`, // Get user by ID
    CREATE_USER: "/api/users", // Create a new user (Admin only)
    UPDATE_USER: (userId) => `/api/users/${userId}`, // Update user details
    DELETE_USER: (userId) => `/api/users/${userId}`, // Delete a user
    RESET_USER_PASSWORD: (userId) => `/api/users/${userId}/password`,
  },

  PROFILE: {
    UPDATE_PHOTO: "/api/users/profile/photo",
    DELETE_PHOTO: "/api/users/profile/photo",    
    CHANGE_PASSWORD: "/api/users/profile/password",   // Delete a user
    UPDATE_PROFILE: "/api/auth/profile",
  },

  TASKS: {
    GET_DASHBOARD_DATA: "/api/tasks/dashboard-data", // Get Dashboard Data
    GET_NOTIFICATIONS: "/api/tasks/notifications", // Get dashboard notifications
    GET_USER_DASHBOARD_DATA: "/api/tasks/user-dashboard-data", // Get User Dashboard Data
    GET_ALL_TASKS: "/api/tasks", // Get all tasks (Admin: all, User: only assigned tasks)
    GET_TASK_BY_ID: (taskId) => `/api/tasks/${taskId}`, // Get task by ID
    CREATE_TASK: "/api/tasks", // Create a new task (Admin only)
    UPDATE_TASK: (taskId) => `/api/tasks/${taskId}`, // Update task details
    DELETE_TASK: (taskId) => `/api/tasks/${taskId}`, // Delete a task (Admin only)

    UPDATE_TASK_STATUS: (taskId) => `/api/tasks/${taskId}/status`, // Update task status
    UPDATE_TODO_CHECKLIST: (taskId) => `/api/tasks/${taskId}/todo`, // Update todo checklist
  },
  NOTICES: {
    PUBLISH: "/api/notices",
    GET_ACTIVE: "/api/notices/active",
    GET_ALL: "/api/notices",
    DELETE: (noticeId) => `/api/notices/${noticeId}`,
  },

  MATTERS: {
    GET_ALL: "/api/matters",
    GET_CLIENTS: "/api/matters/clients",    
    GET_BY_ID: (matterId) => `/api/matters/${matterId}`,
    CREATE: "/api/matters",
    UPDATE: (matterId) => `/api/matters/${matterId}`,
    DELETE: (matterId) => `/api/matters/${matterId}`,
  },

  CASES: {
    GET_ALL: "/api/cases",
    GET_BY_ID: (caseId) => `/api/cases/${caseId}`,
    CREATE: "/api/cases",
    UPDATE: (caseId) => `/api/cases/${caseId}`,
    DELETE: (caseId) => `/api/cases/${caseId}`,
  },
  
  INVOICES: {
    GET_ALL: "/api/invoices",
    GET_BY_ID: (invoiceId) => `/api/invoices/${invoiceId}`,
    CREATE: "/api/invoices",
    UPDATE: (invoiceId) => `/api/invoices/${invoiceId}`,
    DELETE: (invoiceId) => `/api/invoices/${invoiceId}`,
  },

  IMAGE: {
    UPLOAD_IMAGE: "/api/upload/image",
  },
};
