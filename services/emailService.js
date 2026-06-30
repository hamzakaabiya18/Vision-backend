const nodemailer = require('nodemailer')

/* Sends a "you got a message" notification to a human behind a VISION
   bot/admin persona. Gracefully no-ops if SMTP isn't configured — the
   message is always saved to the database regardless, this is purely a
   "notify a human" convenience on top. */
let transporter = null
let warnedOnce = false

/* Per-persona recipient mapping. Falls back to SUPPORT_EMAIL for any
   persona without a dedicated address configured. */
const PERSONA_EMAIL_ENV = {
  support:     'HAMZA_EMAIL',
  coordinator: 'ASSALE_EMAIL',
  coach:       'MAY_EMAIL',
}

function recipientFor(persona) {
  const envKey = PERSONA_EMAIL_ENV[persona]
  return (envKey && process.env[envKey]) || process.env.SUPPORT_EMAIL
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
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

async function notifyDirectMessage({ persona, recipientName, user, body, conversationId }) {
  const to = recipientFor(persona)
  if (!smtpConfigured() || !to) {
    if (!warnedOnce) {
      console.warn('Email notification skipped because SMTP is not configured.')
      warnedOnce = true
    }
    return
  }
  try {
    await getTransporter().sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to,
      subject: `VISION — new message for ${recipientName} from ${user.fullName || user.username}`,
      text: [
        `To: ${recipientName}`,
        `From: ${user.fullName} (@${user.username})`,
        `Sender email: ${user.email || 'n/a'}`,
        `Sender user ID: ${user._id}`,
        conversationId ? `Conversation ID: ${conversationId}` : null,
        `Time: ${new Date().toISOString()}`,
        '',
        'Message:',
        body,
      ].filter(Boolean).join('\n'),
    })
  } catch (err) {
    console.warn('Email notification failed to send:', err.message)
  }
}

module.exports = { notifyDirectMessage }
