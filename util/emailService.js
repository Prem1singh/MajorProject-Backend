import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Generic template for sending credentials
const credentialsEmailTemplate = (name, email, password, role) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Welcome to UniTrack</title>
    </head>
    <body style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 20px;">
      <table width="100%" style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
        <tr>
          <td style="background: #4f46e5; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">UniTrack</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px; color: #333;">
            <h2 style="margin-top: 0;">Hi ${name || "User"},</h2>
            <p>Your ${role} account has been created successfully. Here are your login details:</p>
            <p><b>Email:</b> ${email}</p>
            <p><b>Password:</b> ${password}</p>
            <p style="margin-top:20px;">Please change your password after logging in for the first time.</p>
          </td>
        </tr>
        <tr>
          <td style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            &copy; ${new Date().getFullYear()} UniTrack. All rights reserved.
          </td>
        </tr>
      </table>
    </body>
  </html>
`;

export const sendCredentialsEmail = async (to, name, password, role) => {
  try {
    const mailOptions = {
      from: `"UniTrack" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Your ${role} account credentials`,
      html: credentialsEmailTemplate(name, to, password, role),
    };

    await transporter.sendMail(mailOptions);

  } catch (err) {
    console.error("❌ Error sending credentials email:", err.message);
    throw new Error("Failed to send credentials email");
  }
};
