import nodemailer from 'nodemailer'

type PasswordEmailPayload = {
    password: string
    email: string
    name?: string
}

function getMailerConfig() {
    const user = process.env.EMAIL_USER?.trim()
    const password = process.env.EMAIL_PASSWORD?.trim()
    const senderName = process.env.EMAIL_USER_NAME?.trim() || 'Shea'

    if (!user || !password) {
        throw new Error('Missing EMAIL_USER or EMAIL_PASSWORD environment variables')
    }

    return { user, password, senderName }
}

function createTransporter() {
    const { user, password } = getMailerConfig()

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user,
            pass: password,
        },
    })
}

export async function sendEmailPassword({ password, email, name = 'beautiful' }: PasswordEmailPayload) {
    const { user, senderName } = getMailerConfig()
    const mailOptions = {
        from: `"${senderName}" <${user}>`,
        to: email,
        subject: 'Welcome to Shea',
        text: `Hello,

        You can now access your account using the following credentials:

        Email: ${email}
        Password: ${password}

        With love,  
        The Shea Team`,
        html: `
            <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #fffafc; padding: 30px; text-align: center; color: #333;">
            <div style="max-width: 500px; margin: auto; background: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 25px;">
                <h2 style="color: #e295b5; margin-bottom: 10px;">Welcome to Shea</h2>
                <p style="font-size: 15px; margin: 10px 0;">Hello <b>${name}</b>,</p>
                <p style="font-size: 15px; margin: 10px 0;">
                You can now access your account using the following credentials:
                </p>
                <div style="background: #fdf0f5; border-radius: 12px; padding: 15px; margin: 20px 0; text-align: left;">
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Password:</strong> ${password}</p>
                </div>
                
                <p style="margin-top: 25px; font-size: 15px;">
                With love, <br><strong style="color: #e295b5;">The Shea Team</strong>
                </p>
            </div>
            </div>
        `
    }

    const info = await createTransporter().sendMail(mailOptions)
    return info.messageId || info.response || 'sent'
}
