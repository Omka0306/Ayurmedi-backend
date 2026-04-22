const IS_PROD = process.env.STAGE === "prod";

export const success = (data, statusCode = 200) => {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
    },
    body: JSON.stringify({ success: true, data }),
  };
};

export const error = (message, statusCode = 400) => {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
    },
    body: JSON.stringify({ success: false, error: message }),
  };
};

export const paginated = (items, lastKey, statusCode = 200) => {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
    },
    body: JSON.stringify({ success: true, data: { items, lastKey } }),
  };
};

/**
 * Generic 500 handler for unexpected errors.
 * - In prod: returns a sanitized "Internal server error" with no stack trace.
 * - In all environments: logs the full error (message + stack) to CloudWatch.
 */
export const serverError = (requestId, err) => {
  console.error(
    JSON.stringify({
      requestId,
      error: err?.message,
      stack: err?.stack,
    })
  );
  return {
    statusCode: 500,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
    },
    body: JSON.stringify({
      success: false,
      error: IS_PROD
        ? "Internal server error"
        : (err?.message || "Internal server error"),
    }),
  };
};

/**
 * Masks a mobile number for safe logging — shows only last 4 digits.
 * e.g. "9876543210" → "****3210"
 */
export const maskMobile = (mobile) => {
  if (!mobile || mobile.length < 4) return "****";
  return `****${String(mobile).slice(-4)}`;
};
