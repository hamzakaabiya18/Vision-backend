const nodemailer = require('nodemailer')

/* Sends a "you got a message" notification to the real human behind a
   VISION support persona. Never throws — callers always get back a
   structured { sent, error } result so the rest of the system (and the
   user-facing bot reply) can be honest about whether the email actually
   went out, instead of assuming success. */

/* Stable persona ids (the bot's `username` in the DB, not its display
   name) so a future rename of HAMZA/ASALEH/MAY's display name can never
   silently break the email mapping. */
const PERSONA_EMAIL_ENV = {
  hamza_support:     'HAMZA_EMAIL',
  asaleh_coordinator: 'ASALEH_EMAIL',
  may_coach:          'MAY_EMAIL',
}

let transporter = null

function recipientFor(personaUsername) {
  const envKey = PERSONA_EMAIL_ENV[personaUsername]
  return (envKey && process.env[envKey]) || process.env.SUPPORT_EMAIL || null
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

/* Called once at server boot so missing SMTP config is loud in the logs
   immediately, not discovered silently the first time a user messages
   support. */
function logStartupStatus() {
  if (!smtpConfigured()) {
    console.warn('[email] SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing). Support emails will not be sent — messages will still be saved.')
    return
  }
  const missing = Object.entries(PERSONA_EMAIL_ENV).filter(([, envKey]) => !process.env[envKey])
  if (missing.length) {
    console.warn(`[email] SMTP is configured, but no recipient address set for: ${missing.map(([persona]) => persona).join(', ')}. Those personas will fall back to SUPPORT_EMAIL${process.env.SUPPORT_EMAIL ? '' : ' (also unset!)'}.`)
  } else {
    console.log('[email] SMTP configured and all persona recipient emails are set.')
  }
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

/* persona: the bot's stable `username` (e.g. 'hamza_support').
   Returns { sent: boolean, error: string|null, to: string|null } —
   never throws. */
async function notifyDirectMessage({ persona, recipientName, user, body, conversationId }) {
  console.log(`[email] Support message detected for persona "${persona}" (${recipientName})`)

  const to = recipientFor(persona)
  if (!to) {
    const error = 'No recipient email configured for this persona and no SUPPORT_EMAIL fallback set.'
    console.warn(`[email] ${error}`)
    return { sent: false, error, to: null }
  }
  if (!smtpConfigured()) {
    const error = 'SMTP is not configured.'
    console.warn(`[email] ${error} (would have sent to ${to})`)
    return { sent: false, error, to }
  }

  console.log(`[email] Attempting to send support email to: ${to}`)
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
    console.log('[email] Support email sent successfully')
    return { sent: true, error: null, to }
  } catch (err) {
    console.warn(`[email] Support email failed: ${err.message}`)
    return { sent: false, error: err.message, to }
  }
}

module.exports = { notifyDirectMessage, smtpConfigured, logStartupStatus, PERSONA_EMAIL_ENV }
