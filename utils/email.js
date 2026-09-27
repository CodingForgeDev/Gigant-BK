const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

const from = () => process.env.SMTP_FROM || "Gigant <noreply@gigant.dev>";

async function sendWelcomeEmail(to, name) {
  const t = getTransporter();
  if (!t) return;
  await t.sendMail({
    from: from(),
    to,
    subject: "Welcome to Gigant",
    html: `<h2>Welcome, ${name}!</h2>
<p>Your account has been created. You can now sign in and start managing your GitHub collaborators.</p>
<p>— The Gigant Team</p>`,
  });
}

async function sendPasswordResetEmail(to, resetUrl) {
  const t = getTransporter();
  if (!t) return;
  await t.sendMail({
    from: from(),
    to,
    subject: "Reset Your Password — Gigant",
    html: `<h2>Password Reset</h2>
<p>Click the link below to reset your password. This link expires in 1 hour.</p>
<p><a href="${resetUrl}">${resetUrl}</a></p>
<p>If you didn't request this, ignore this email.</p>`,
  });
}

async function sendContactNotification(to, message) {
  const t = getTransporter();
  if (!t) return;
  await t.sendMail({
    from: from(),
    to,
    subject: `New Contact Message: ${message.subject || "(No subject)"}`,
    html: `<h3>New message from ${message.name}</h3>
<p><strong>Email:</strong> ${message.email}</p>
<p><strong>Subject:</strong> ${message.subject || "(No subject)"}</p>
<p>${message.body}</p>`,
  });
}

module.exports = { sendWelcomeEmail, sendPasswordResetEmail, sendContactNotification };
