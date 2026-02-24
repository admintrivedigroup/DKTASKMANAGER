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
    DELETE_NOTIFICATIONS: "/api/tasks/notifications", // Delete notifications for current user
    GET_USER_DASHBOARD_DATA: "/api/tasks/user-dashboard-data", // Get User Dashboard Data
    GET_ALL_TASKS: "/api/tasks", // Get all tasks (Admin: all, User: only assigned tasks)
    GET_TASK_BY_ID: (taskId) => `/api/tasks/${taskId}`, // Get task by ID
    CREATE_TASK: "/api/tasks", // Create a new task (Admin only)
    CREATE_PERSONAL_TASK: "/api/tasks/personal", // Create a personal task (member only)
    UPDATE_TASK: (taskId) => `/api/tasks/${taskId}`, // Update task details
    DELETE_TASK: (taskId) => `/api/tasks/${taskId}`, // Delete a task (Admin only)

    UPDATE_TASK_STATUS: (taskId) => `/api/tasks/${taskId}/status`, // Update task status
    UPDATE_TODO_CHECKLIST: (taskId) => `/api/tasks/${taskId}/todo`, // Update todo checklist
    GET_TASK_MESSAGES: (taskId) => `/api/tasks/${taskId}/messages`,
    POST_TASK_MESSAGE: (taskId) => `/api/tasks/${taskId}/messages`,
    UPDATE_TASK_MESSAGE: (messageId) => `/api/tasks/messages/${messageId}`,
    DELETE_TASK_MESSAGE: (messageId) => `/api/tasks/messages/${messageId}`,
    CREATE_DUE_DATE_REQUEST: (taskId) => `/api/tasks/${taskId}/due-date-request`,
    MARK_TASK_NOTIFICATIONS_READ: (taskId) =>
      `/api/tasks/${taskId}/channel-notifications/read`, // Mark task assignment as read
    GET_CHANNEL_NOTIFICATIONS_UNREAD: "/api/tasks/channel-notifications/unread-count", // Unread task assignment count
  },
  DUE_DATE_REQUESTS: {
    APPROVE: (requestId) => `/api/due-date-requests/${requestId}/approve`,
    REJECT: (requestId) => `/api/due-date-requests/${requestId}/reject`,
  },
  LEAVES: {
    CREATE: "/api/leaves",
    GET_MY: "/api/leaves/me",
    GET_PENDING: "/api/leaves/pending",
    UPDATE_STATUS: (leaveId) => `/api/leaves/${leaveId}/status`,
    DELETE: (leaveId) => `/api/leaves/${leaveId}`,
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
  ROLES: {
    GET_ALL: "/api/roles",
    CREATE: "/api/roles",
    DELETE: (roleId) => `/api/roles/${roleId}`,
  },
};
