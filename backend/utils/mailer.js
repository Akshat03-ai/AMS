const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SYSTEM_EMAIL,
    pass: process.env.SYSTEM_EMAIL_PASSWORD,
  },
});

async function sendAccountEmail({ to, name, tempPassword, resetLink }) {
  await transporter.sendMail({
    from: `"Asset Management System" <${process.env.SYSTEM_EMAIL}>`,
    to,
    subject: "Your Asset Management System Account",
    html: `
      <p>Hello <b>${name}</b>,</p>

      <p>Your account has been created in the <b>Asset Management System</b>.</p>

      <p><b>Initial Password:</b> ${tempPassword}</p>

      <p>Please reset your password immediately using the link below:</p>

      <p>
        <a href="${resetLink}" target="_blank">
          Reset Password
        </a>
      </p>

      <p>If you did not expect this email, please contact your administrator.</p>

      <br/>
      <p>— Asset Management System</p>
    `,
  });
}

module.exports = { sendAccountEmail };