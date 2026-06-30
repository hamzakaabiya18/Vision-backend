const nodemailer = require('nodemailer')

/* Sends support-message notifications to a human admin. Gracefully no-ops
   if SMTP isn't configured — the message is always saved to the database
   regardless, this is purely a "notify a human" convenience on top. */
let transporter = null
let warnedOnce = false

function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SUPPORT_EMAIL)
}

function getTransporter() {
  if (transporter) return transporter
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  return transporter
}

async function notifySupportMessage({ user, body, conversationId }) {
  if (!isConfigured()) {
    if (!warnedOnce) {
      console.warn('Support email not sent because SMTP is not configured.')
      warnedOnce = true
    }
    return
  }
  try {
    await getTransporter().sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: process.env.SUPPORT_EMAIL,
      subject: `VISION Support — new message from ${user.fullName || user.username}`,
      text: [
        `User: ${user.fullName} (@${user.username})`,
        `User email: ${user.email || 'n/a'}`,
        `User ID: ${user._id}`,
        conversationId ? `Conversation ID: ${conversationId}` : null,
        `Time: ${new Date().toISOString()}`,
        '',
        'Message:',
        body,
      ].filter(Boolean).join('\n'),
    })
  } catch (err) {
    console.warn('Support email failed to send:', err.message)
  }
}

module.exports = { notifySupportMessage, isConfigured }
