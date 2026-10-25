/**
 * Auth form validation helpers.
 * Extracted from login/page.jsx.
 */

import {
  registerValidationErrorCodes,
  passwordSimilarityMessage,
} from "./authConstants.js";

export function sanitizeBusinessPhoneInput(value) {
  return String(value ?? "").replace(/\D/g, "");
}

/**
 * Validates a pre-sanitized (digits-only) business phone string.
 * Returns an error message string if invalid, or null if valid.
 * Rule: 7 to 15 digits (E.164-compatible; covers PH/JP/SG/TH/MY formats).
 */
export function validateBusinessPhone(digits) {
  if (!digits) return "Business phone is required";
  if (digits.length < 7 || digits.length > 15) {
    return "Enter a valid phone number (7–15 digits)";
  }
  return null;
}

export function sanitizeEmailInput(value) {
  return String(value ?? "").toLowerCase();
}

export function getPasswordSimilarityError(
  emailValue,
  nameValue,
  passwordValue,
) {
  const normalizedEmail = emailValue.trim().toLowerCase();
  const normalizedName = nameValue.trim().toLowerCase();
  const normalizedPassword = passwordValue.toLowerCase();
  const emailLocalPart = normalizedEmail.split("@")[0] ?? "";

  if (
    normalizedPassword === normalizedEmail ||
    normalizedPassword === normalizedName ||
    (emailLocalPart && normalizedPassword === emailLocalPart)
  ) {
    return passwordSimilarityMessage;
  }

  return null;
}

export function mapAuthErrorToRegisterErrors(error) {
  if (!error || !registerValidationErrorCodes.has(error.code)) {
    return {};
  }

  if (error.code === "EMAIL_ALREADY_USED") {
    return { email: error.message };
  }

  if (error.code === "PASSWORD_TOO_SHORT") {
    return { password: error.message };
  }

  if (error.code === "DISPLAY_NAME_REQUIRED") {
    return { fullName: error.message };
  }

  const fieldErrors = {};
  for (const issue of error.issues || []) {
    const field = issue?.path?.[0];
    if (field === "displayName") {
      fieldErrors.fullName = issue.message;
    } else if (field === "email") {
      fieldErrors.email = issue.message;
    } else if (field === "password") {
      fieldErrors.password = issue.message;
    }
  }

  return fieldErrors;
}

/**
 * Checks the sign-in fields before they reach the server, so an empty or
 * malformed field gets a field message instead of the server's generic
 * "Request validation failed." Returns { email?, password? }.
 */
export function validateLoginFields(emailValue, passwordValue) {
  const errors = {};
  const trimmedEmail = String(emailValue ?? "").trim();
  if (!trimmedEmail) errors.email = "Enter your email address";
  else if (!/\S+@\S+\.\S+/.test(trimmedEmail)) errors.email = "Enter a valid email address";
  if (!passwordValue) errors.password = "Enter your password";
  return errors;
}

// Sign-in error text for the alert under the form. The server's schema
// rejection reads "Request validation failed.", which means nothing to a user.
export function getLoginErrorMessage(error) {
  if (!error) return "";
  if (error.code === "VALIDATION_ERROR") {
    return "Check your email and password, then try again.";
  }
  return error.message || "Something went wrong. Please try again.";
}
