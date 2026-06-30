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

    const appUrl   = process.env.CLIENT_URL || 'https://vision-ten-tau.vercel.app'
    const replyUrl = `${appUrl}?openChat=${user._id}`

    const html = `
<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e8f4f4;overflow:hidden">
  <div style="background:linear-gradient(135deg,#004444,#008080);padding:28px 32px">
    <p style="color:#00E676;font-size:12px;font-weight:700;letter-spacing:.12em;margin:0 0 4px">VISION ATHLETIC INTELLIGENCE</p>
    <p style="color:#fff;font-size:22px;font-weight:800;margin:0">New message for ${recipientName}</p>
  </div>
  <div style="padding:28px 32px">
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr><td style="padding:6px 0;color:#9aaab8;font-size:12px;font-weight:600;width:100px">FROM</td><td style="padding:6px 0;color:#1a1a2e;font-size:14px;font-weight:700">${user.fullName || user.username} (@${user.username})</td></tr>
      <tr><td style="padding:6px 0;color:#9aaab8;font-size:12px;font-weight:600">EMAIL</td><td style="padding:6px 0;color:#1a1a2e;font-size:14px">${user.email || 'n/a'}</td></tr>
      <tr><td style="padding:6px 0;color:#9aaab8;font-size:12px;font-weight:600">TIME</td><td style="padding:6px 0;color:#1a1a2e;font-size:14px">${new Date().toLocaleString()}</td></tr>
    </table>
    <div style="background:#f7fbfb;border-left:4px solid #008080;border-radius:0 12px 12px 0;padding:16px 20px;margin-bottom:28px">
      <p style="margin:0;color:#1a1a2e;font-size:15px;line-height:1.6">${body.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
    </div>
    <a href="${replyUrl}" style="display:inline-block;background:linear-gradient(135deg,#008080,#00c853);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:700;letter-spacing:.02em">Reply in VISION</a>
    <p style="margin:20px 0 0;color:#9aaab8;font-size:12px">Or open the app and search for <strong>@${user.username}</strong> in Messages.</p>
  </div>
</div>`

    await resend.emails.send({
      from: 'VISION Support <onboarding@resend.dev>',
      to,
      subject: `VISION — ${user.fullName || user.username} sent you a message`,
      text,
      html,
    })
    console.log('[email] Support email sent successfully via Resend')
    return { sent: true, error: null, to }
  } catch (err) {
    console.warn(`[email] Support email failed: ${err.message}`)
    return { sent: false, error: err.message, to }
  }
}

module.exports = { notifyDirectMessage, isConfigured, logStartupStatus }
