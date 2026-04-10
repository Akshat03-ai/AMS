const nodemailer = require("nodemailer");

const isMailerConfigured = Boolean(
  process.env.SYSTEM_EMAIL && process.env.SYSTEM_EMAIL_PASSWORD
);

const transporter = isMailerConfigured
  ? nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.SYSTEM_EMAIL,
        pass: process.env.SYSTEM_EMAIL_PASSWORD,
      },
    })
  : null;

if (transporter) {
  transporter.verify((error) => {
    if (error) {
      console.error("Mailer verification failed:", error);
    } else {
      console.log("Mailer is ready to send messages");
    }
  });
} else {
  console.warn("Mailer is disabled: SYSTEM_EMAIL credentials are not configured.");
}

async function sendAccountEmail({ to, name, tempPassword, resetLink }) {
  if (!transporter) {
    throw new Error("Mailer is not configured");
  }

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

module.exports = { sendAccountEmail, isMailerConfigured };
