const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message =
      data.message ||
      data.errors?.[0]?.msg ||
      'Something went wrong'
    const error = new Error(message)
    error.status = res.status
    error.data = data
    throw error
  }

  return data
}

export const authApi = {
  sendSignupOtp: (body) => request('/api/auth/send-signup-otp', { method: 'POST', body }),
  verifySignupOtp: (body) => request('/api/auth/verify-signup-otp', { method: 'POST', body }),
  finishSignup: (body) => request('/api/auth/finish-signup', { method: 'POST', body }),
  login: (body) => request('/api/auth/login', { method: 'POST', body }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),
  refresh: () => request('/api/auth/refresh', { method: 'POST' }),
  sendPasswordResetOtp: (body) =>
    request('/api/auth/send-password-reset-otp', { method: 'POST', body }),
  verifyPasswordResetOtp: (body) =>
    request('/api/auth/verify-password-reset-otp', { method: 'POST', body }),
  resetPassword: (body) =>
    request('/api/auth/reset-password', { method: 'POST', body }),
  verifyMfaEnable: (body) => request('/api/auth/verify-2fa', { method: 'POST', body }),
  complete2faLogin: (body) => request('/api/auth/complete-2fa-login', { method: 'POST', body }),
  loginWithBackupCode: (body) =>
    request('/api/auth/login-with-backup-code', { method: 'POST', body }),
  enable2fa: () => request('/api/auth/enable-2fa', { method: 'POST' }),
  verifyDisableOtp: (body) =>
    request('/api/auth/verify-disable-otp', { method: 'POST', body }),
  verifyDisableBackupCode: (body) =>
    request('/api/auth/verify-disable-backup-code', { method: 'POST', body }),
  googleUrl: `${API_BASE}/api/auth/auth/google`,
}
