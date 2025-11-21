const DEV_FALLBACK_SECRET = "taskmanager-development-secret-do-not-use-in-production";

const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";

const getJwtSecret = () => {
  if (isNonEmptyString(process.env.JWT_SECRET)) {
    return process.env.JWT_SECRET.trim();
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT secret is not configured");
  }

  if (!global.__TASKMANAGER_WARNED_MISSING_JWT_SECRET__) {
    console.warn(
      "JWT_SECRET is not set. Falling back to a development secret. This should never be used in production."
    );
    global.__TASKMANAGER_WARNED_MISSING_JWT_SECRET__ = true;
  }

  return DEV_FALLBACK_SECRET;
};

module.exports = { getJwtSecret };