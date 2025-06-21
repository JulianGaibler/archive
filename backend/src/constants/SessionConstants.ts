// Session management constants shared across the application

/** Maximum number of active sessions allowed per user */
export const MAX_SESSIONS_PER_USER = 10

/** Token rotation interval: 24 hours in milliseconds */
export const TOKEN_ROTATION_TIME = 24 * 60 * 60 * 1000

/** Session expiry time: 5 days in milliseconds */
export const SESSION_EXPIRY_TIME = 5 * 24 * 60 * 60 * 1000

/** Cookie max age: SESSION_EXPIRY_TIME + 12 hours buffer in milliseconds */
export const COOKIE_MAX_AGE = SESSION_EXPIRY_TIME + 12 * 60 * 60 * 1000
