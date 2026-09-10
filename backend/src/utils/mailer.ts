import nodemailer from 'nodemailer'

type PasswordEmailPayload = {
    password: string
    email: string
    name?: string
}

type AccessCodeEmailPayload = PasswordEmailPayload & {
    purpose?: 'welcome' | 'reset'
}

type AccessCodeEmailContent = {
    subject: string
    text: string
    html: string
}

function escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    })[character]!)
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

export async function sendAccessCodeEmail({
    password,
    email,
    name = 'there',
    purpose = 'welcome',
}: AccessCodeEmailPayload) {
    const { user, senderName } = getMailerConfig()
    const content = buildAccessCodeEmail({ password, email, name, purpose })
    const mailOptions = {
        from: `"${senderName}" <${user}>`,
        to: email,
        ...content,
    }

    const info = await createTransporter().sendMail(mailOptions)
    return info.messageId || info.response || 'sent'
}

export function buildAccessCodeEmail({
    password,
    email,
    name = 'there',
    purpose = 'welcome',
}: AccessCodeEmailPayload): AccessCodeEmailContent {
    const isReset = purpose === 'reset'
    const title = isReset ? 'Your Shea access code was reset' : 'Welcome to Shea'
    const introduction = isReset
        ? 'An administrator reset the access code for your Shea account.'
        : 'You can now access your Shea account using the following credentials.'
    const safeName = escapeHtml(name)
    const safeEmail = escapeHtml(email)
    const safePassword = escapeHtml(password)
    return {
        subject: title,
        text: `Hello,

        ${introduction}

        Email: ${email}
        Access code: ${password}

        If you did not expect this change, contact Shea support immediately.

        With love,  
        The Shea Team`,
        html: `
            <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #fffafc; padding: 30px; text-align: center; color: #333;">
            <div style="max-width: 500px; margin: auto; background: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 25px;">
                <h2 style="color: #e295b5; margin-bottom: 10px;">${title}</h2>
                <p style="font-size: 15px; margin: 10px 0;">Hello <b>${safeName}</b>,</p>
                <p style="font-size: 15px; margin: 10px 0;">
                ${introduction}
                </p>
                <div style="background: #fdf0f5; border-radius: 12px; padding: 15px; margin: 20px 0; text-align: left;">
                <p><strong>Email:</strong> ${safeEmail}</p>
                <p><strong>Access code:</strong> <code style="font-size: 16px; user-select: all;">${safePassword}</code></p>
                </div>
                <p style="font-size: 13px; color: #777;">If you did not expect this change, contact Shea support immediately.</p>
                
                <p style="margin-top: 25px; font-size: 15px;">
                With love, <br><strong style="color: #e295b5;">The Shea Team</strong>
                </p>
            </div>
            </div>
        `
    }
}

export function sendEmailPassword(payload: PasswordEmailPayload) {
    return sendAccessCodeEmail({ ...payload, purpose: 'welcome' })
}
