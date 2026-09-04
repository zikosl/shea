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

  const productionOrigin = process.env.SHEA_DOMAIN ? `https://${process.env.SHEA_DOMAIN}` : undefined
  return [productionOrigin, process.env.NEXTAUTH_URL, 'http://localhost:3000']
    .filter((origin): origin is string => Boolean(origin))
}

const nodeEnv = process.env.NODE_ENV ?? 'development'
const requiredProductionSecret = (name: string, fallback: string) => {
  const value = process.env[name]
  if (nodeEnv === 'production' && (!value || value === fallback)) {
    throw new Error(`${name} must be configured in production`)
  }
  return value ?? fallback
}

export const env = {
  nodeEnv,
  host: process.env.HOST ?? '0.0.0.0',
  port: Number(process.env.PORT ?? 4000),
  jwtAccessSecret: requiredProductionSecret('JWT_ACCESS_SECRET', 'change-me-access-secret'),
  jwtRefreshSecret: requiredProductionSecret('JWT_REFRESH_SECRET', 'change-me-refresh-secret'),
  smsProxyTarget: process.env.SMS_PROXY_TARGET,
  cloudGatewayServiceToken: process.env.CLOUD_GATEWAY_SERVICE_TOKEN ?? '',
  firebaseServiceAccountPath:
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ??
    'shea-12-firebase-adminsdk-fbsvc-dfc06bc22c.json',
  allowedCorsOrigins: resolveAllowedOrigins(),
  otpBypassCode:
    process.env.NODE_ENV !== 'production'
      ? process.env.OTP_BYPASS_CODE ?? '123456'
      : undefined,
  appReviewOtp: {
    // This is a testing exception, never an implicit production login path.
    enabled: process.env.APP_REVIEW_OTP_ENABLED === 'true',
    phone: process.env.APP_REVIEW_OTP_PHONE ?? '',
    code: process.env.APP_REVIEW_OTP_CODE ?? '',
  },
}

export const isProduction = env.nodeEnv === 'production'
