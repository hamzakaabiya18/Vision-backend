const User     = require('../models/User')
const Activity = require('../models/Activity')
const Group    = require('../models/Group')

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

module.exports = { getStats, getUsers, updateUserRole }
