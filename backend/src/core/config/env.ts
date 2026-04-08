const splitCsv = (value?: string) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const resolveAllowedOrigins = () => {
  const configured = splitCsv(process.env.CORS_ALLOWED_ORIGINS ?? process.env.CORS_ORIGIN)
  if (configured.length > 0) {
    return configured
  }

  return ['https://glowy-front.vercel.app', 'http://localhost:3000']
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  host: process.env.HOST ?? '0.0.0.0',
  port: Number(process.env.PORT ?? 4000),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret',
  smsProxyTarget: process.env.SMS_PROXY_TARGET,
  firebaseServiceAccountPath:
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ??
    'shea-12-firebase-adminsdk-fbsvc-dfc06bc22c.json',
  allowedCorsOrigins: resolveAllowedOrigins(),
  otpBypassCode:
    process.env.NODE_ENV !== 'production'
      ? process.env.OTP_BYPASS_CODE ?? '123456'
      : undefined,
}

export const isProduction = env.nodeEnv === 'production'
