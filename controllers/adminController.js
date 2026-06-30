const User     = require('../models/User')
const Activity = require('../models/Activity')
const Group    = require('../models/Group')
const Message  = require('../models/Message')
const { notifyDirectMessage } = require('../services/emailService')

async function getStats(req, res) {
  const [userCount, activityCount, groupCount, recentActivities] = await Promise.all([
    User.countDocuments({ isBot: { $ne: true } }),
    Activity.countDocuments(),
    Group.countDocuments(),
    Activity.find().sort({ createdAt: -1 }).limit(8)
      .select('title sportType distanceKm createdAt')
      .populate('user', 'username fullName avatarUrl'),
  ])
  res.json({ userCount, activityCount, groupCount, recentActivities })
}

async function getUsers(req, res) {
  const { limit = 50, offset = 0, q } = req.query
  const filter = { isBot: { $ne: true } }
  if (q) filter.$or = [{ username: { $regex: q, $options: 'i' } }, { fullName: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }]
  const [users, total] = await Promise.all([
    User.find(filter).select('-password').sort({ createdAt: -1 }).skip(Number(offset)).limit(Number(limit)),
    User.countDocuments(filter),
  ])
  res.json({ users, total })
}

async function updateUserRole(req, res) {
  const { role } = req.body
  if (!['user', 'groupOwner', 'admin'].includes(role)) return res.status(400).json({ message: 'Invalid role' })
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password')
  if (!user) return res.status(404).json({ message: 'User not found' })
  res.json({ user })
}

/* Reliability fallback: if the email notification fails or SMTP isn't
   configured, admins can still see every support message here — the
   message was never lost just because the email didn't go out. */
async function getSupportMessages(req, res) {
  const { unsentOnly } = req.query
  const filter = { isSupportMessage: true }
  if (unsentOnly === 'true') filter.emailSent = false
  const messages = await Message.find(filter)
    .populate('sender', 'username fullName email avatarUrl')
    .sort({ createdAt: -1 })
    .limit(200)
  res.json({ messages })
}

/* Lets an admin verify SMTP end-to-end against a real persona inbox
   without needing a second account to send a real chat message. */
async function sendTestEmail(req, res) {
  const { persona } = req.body
  const valid = ['hamza_support', 'asaleh_coordinator', 'may_coach']
  if (!valid.includes(persona)) return res.status(400).json({ message: `persona must be one of: ${valid.join(', ')}` })

  const names = { hamza_support: 'HAMZA', asaleh_coordinator: 'ASALEH', may_coach: 'MAY' }
  const result = await notifyDirectMessage({
    persona,
    recipientName: names[persona],
    user: req.user,
    body: 'This is a test email from VISION admin tools to verify SMTP delivery.',
    conversationId: null,
  })
  res.json({ emailSent: result.sent, emailError: result.error, to: result.to })
}

module.exports = { getStats, getUsers, updateUserRole, getSupportMessages, sendTestEmail }
