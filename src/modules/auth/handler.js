import { success, error } from "../../common/response.js";
import { validateBody } from "../../common/validators.js";
import {
  registerHospitalSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "./validators.js";
import * as authService from "./service.js";

export const registerHospital = async (event) => {
  try {
    const data = validateBody(registerHospitalSchema)(event);
    const result = await authService.registerHospital(data);
    return success(result, 201);
  } catch (err) {
    return error(err.message, err.statusCode || 500);
  }
};

export const login = async (event) => {
  try {
    const data = validateBody(loginSchema)(event);
    const result = await authService.login(data);
    return success(result);
  } catch (err) {
    return error(err.message, err.statusCode || 500);
  }
};

export const refresh = async (event) => {
  try {
    const data = validateBody(refreshSchema)(event);
    const result = await authService.refresh(data);
    return success(result);
  } catch (err) {
    return error(err.message, err.statusCode || 500);
  }
};

export const logout = async (event) => {
  try {
    const body =
      typeof event.body === "string"
        ? JSON.parse(event.body || "{}")
        : event.body;
    const { accessToken } = body;
    if (!accessToken) throw new Error("accessToken is required");

    const result = await authService.logout({ accessToken });
    return success(result);
  } catch (err) {
    return error(err.message, err.statusCode || 500);
  }
};

export const forgotPassword = async (event) => {
  try {
    const data = validateBody(forgotPasswordSchema)(event);
    const result = await authService.forgotPassword(data);
    return success(result);
  } catch (err) {
    return error(err.message, err.statusCode || 500);
  }
};

export const resetPassword = async (event) => {
  try {
    const data = validateBody(resetPasswordSchema)(event);
    const result = await authService.resetPassword(data);
    return success(result);
  } catch (err) {
    return error(err.message, err.statusCode || 500);
  }
};

export const changePassword = async (event) => {
  try {
    const data = validateBody(changePasswordSchema)(event);
    const result = await authService.changePassword(data);
    return success(result);
  } catch (err) {
    return error(err.message, err.statusCode || 500);
  }
};
