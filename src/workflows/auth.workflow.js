const cognitoService = require('../services/cognito.service');

const login = async (payload) => {
  const { email, password } = payload;
  return cognitoService.login({ email, password });
};

const logout = async (context) => {
  // In this phase we rely mainly on client-side token discard; context may be used later.
  // Optionally decode/forward access token to a revocation endpoint.
  return { success: true };
};

const forgotPassword = async (payload) => {
  const { email } = payload;
  await cognitoService.forgotPassword({ email });
  return { message: 'Password reset code sent' };
};

const resetPassword = async (payload) => {
  const { email, confirmationCode, newPassword } = payload;
  await cognitoService.resetPassword({ email, confirmationCode, newPassword });
  return { message: 'Password updated successfully' };
};

module.exports = {
  login,
  logout,
  forgotPassword,
  resetPassword,
};

