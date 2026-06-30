const { Resend } = require('resend')

/* Resend replaces nodemailer/SMTP because Render free tier blocks outbound
   SMTP (port 587). Resend uses HTTPS so it works on any host. */

const PERSONA_EMAIL_ENV = {
  hamza_support:      'HAMZA_EMAIL',
  asaleh_coordinator: 'ASALEH_EMAIL',
  may_coach:          'MAY_EMAIL',
}

function recipientFor(personaUsername) {
  const envKey = PERSONA_EMAIL_ENV[personaUsername]
  return (envKey && process.env[envKey]) || process.env.SUPPORT_EMAIL || null
}

function isConfigured() {
  return Boolean(process.env.RESEND_API_KEY)
}

function logStartupStatus() {
  if (!isConfigured()) {
    console.warn('[email] RESEND_API_KEY is not set. Support emails will not be sent — messages will still be saved.')
    return
  }
  const missing = Object.entries(PERSONA_EMAIL_ENV).filter(([, k]) => !process.env[k])
  if (missing.length) {
    console.warn(`[email] Resend configured, but no recipient for: ${missing.map(([p]) => p).join(', ')}. Falls back to SUPPORT_EMAIL${process.env.SUPPORT_EMAIL ? '' : ' (also unset).'}.`)
  } else {
    console.log('[email] Resend configured and all persona recipient emails are set.')
  }
}

async function notifyDirectMessage({ persona, recipientName, user, body, conversationId }) {
  console.log(`[email] Support message detected for persona "${persona}" (${recipientName})`)

  const to = recipientFor(persona)
  if (!to) {
    const error = 'No recipient email configured for this persona.'
    console.warn(`[email] ${error}`)
    return { sent: false, error, to: null }
  }
  if (!isConfigured()) {
    console.warn(`[email] RESEND_API_KEY missing — skipping email (would have sent to ${to})`)
    return { sent: false, error: 'RESEND_API_KEY not configured.', to }
  }

  console.log(`[email] Attempting to send support email to: ${to}`)
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const text = [
      `To: ${recipientName}`,
      `From: ${user.fullName} (@${user.username})`,
      `Sender email: ${user.email || 'n/a'}`,
      `Sender user ID: ${user._id}`,
      conversationId ? `Conversation ID: ${conversationId}` : null,
      `Time: ${new Date().toISOString()}`,
      '',
      'Message:',
      body,
    ].filter(Boolean).join('\n')

    await resend.emails.send({
      from: 'VISION Support <onboarding@resend.dev>',
      to,
      subject: `VISION — new message for ${recipientName} from ${user.fullName || user.username}`,
      text,
    })
    console.log('[email] Support email sent successfully via Resend')
    return { sent: true, error: null, to }
  } catch (err) {
    console.warn(`[email] Support email failed: ${err.message}`)
    return { sent: false, error: err.message, to }
  }
}

module.exports = { notifyDirectMessage, isConfigured, logStartupStatus }
