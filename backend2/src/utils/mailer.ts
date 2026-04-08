import nodemailer from 'nodemailer';


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});



export const sendEmailPassword = ({ password, email, name = "beautiful" }: { password: string, email: string, name?: string }) => {
    const mailOptions = {
        from: `"${process.env.EMAIL_USER_NAME}" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Welcome to Shea ✨",
        text: `Hello,

        You can now access your account using the following credentials:

        Email: ${email}
        Password: ${password}

        With love,  
        The Shea Team`,
        html: `
            <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #fffafc; padding: 30px; text-align: center; color: #333;">
            <div style="max-width: 500px; margin: auto; background: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 25px;">
                <h2 style="color: #e295b5; margin-bottom: 10px;">Welcome to Shea ✨</h2>
                <p style="font-size: 15px; margin: 10px 0;">Hello <b>${name}<b>,</p>
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
    };


    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                reject(error.message);
            } else {
                resolve(info.response);
            }
        });
    });
}

