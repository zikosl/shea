import axios from 'axios'
import twilio from 'twilio'

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
    process.env.OTP_PHONE_SERVER_URL ??
    `http://127.0.0.1:${process.env.PORT ?? '4000'}/send-sms`

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
      errorMsg = error.response?.data?.error || error.message
    }

    return {
      success: false,
      error: errorMsg,
    }
  }
}

/**
 * Sends a 6-digit OTP using Twilio SMS.
 *
 * @param phoneNumber The destination phone number in E.164 format (e.g., +1234567890).
 * @param twilioAccountSid Your Twilio Account SID.
 * @param twilioAuthToken Your Twilio Auth Token.
 * @param fromNumber A verified Twilio phone number to send from.
 */
export async function sendOtpWithTwilio(
  phoneNumber: string,
): Promise<OtpResult> {
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || ''
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || ''
  const fromNumber = process.env.TWILIO_FROM_NUMBER || ''
  if (!twilioAccountSid || !twilioAuthToken || !fromNumber) {
    return {
      success: false,
      error: 'Twilio credentials are not set in environment variables',
    }
  }

  const client = twilio(twilioAccountSid, twilioAuthToken)
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const message = `Your OTP is: ${otp}`

  try {
    await client.messages.create({
      body: message,
      from: fromNumber,
      to: phoneNumber,
    })

    return { success: true, otp }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Twilio SMS failed',
    }
  }
}
