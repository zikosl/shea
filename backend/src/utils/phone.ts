import axios from 'axios'

export interface OtpResult {
  success: boolean
  otp?: string
  error?: string
}

/**
 * Sends a 6-digit OTP via a remote Termux SMS server.
 * @param phoneNumber The phone number to send the OTP to.
 * @param phoneServerUrl The URL of the phone's Termux SMS server (e.g., http://192.168.1.10:8000)
 */


export async function sendOtpViaPhoneServer(
  phoneNumber: string,
): Promise<OtpResult> {
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const message = `Your OTP is: ${otp}`
  const phoneServerUrl =
    process.env.OTP_PHONE_SERVER_URL?.trim() ||
    process.env.PHONE_SERVER_URL?.trim() ||
    process.env.PHONE_IP?.trim() ||
    (process.env.SMS_PROXY_TARGET?.trim()
      ? `http://127.0.0.1:${process.env.PORT ?? '4000'}/send-sms`
      : '')

  if (!phoneServerUrl) {
    return {
      success: false,
      error: 'OTP phone server is not configured',
    }
  }

  try {
    const response = await axios.post(
      phoneServerUrl,
      {
        number: phoneNumber,
        message,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      },
    )

    if (response.status === 200) {
      return { success: true, otp }
    }

    return {
      success: false,
      error: `Unexpected response code: ${response.status}`,
    }
  } catch (error: any) {
    let errorMsg = 'Failed to contact phone server'
    if (axios.isAxiosError(error)) {
      const providerError = error.response?.data?.error
      errorMsg = providerError || (error.response?.status
        ? `SMS provider returned HTTP ${error.response.status}`
        : error.message)
    }

    return {
      success: false,
      error: errorMsg,
    }
  }
}
