const User     = require('../models/User')
const Activity = require('../models/Activity')
const Comment  = require('../models/Comment')

const SAFE_FIELDS = '_id fullName username avatarUrl sportTags bio followers following'

async function searchUsers(req, res) {
  const { q = '' } = req.query
  const filter = {
    isBot: { $ne: true },
    _id:   { $ne: req.user._id },
  }
  if (q.trim()) {
    filter.$or = [
      { fullName: { $regex: q, $options: 'i' } },
      { username: { $regex: q, $options: 'i' } },
    ]
  }
  const users = await User.find(filter).select(SAFE_FIELDS).limit(20).sort({ totalKm: -1 })
  const myId = String(req.user._id)
  const result = users.map(u => {
    const obj = u.toObject()
    obj.followersCount = obj.followers?.length || 0
    obj.followingCount = obj.following?.length || 0
    obj.isFollowedByMe = (obj.followers || []).some(f => String(f) === myId)
    delete obj.followers
    delete obj.following
    return obj
  })
  res.json({ users: result })
}

async function getUsers(req, res) {
  const { q, sport, limit = 20, offset = 0 } = req.query
  const filter = {}
  if (q) filter.$or = [
    { fullName: { $regex: q, $options: 'i' } },
    { username: { $regex: q, $options: 'i' } },
    { location: { $regex: q, $options: 'i' } },
  ]
  if (sport) filter.sportTags = sport

  const total = await User.countDocuments(filter)
  const users = await User.find(filter)
    .select('-password')
    .skip(Number(offset))
    .limit(Number(limit))
    .sort({ totalKm: -1 })

  res.json({ users, total, limit: Number(limit), offset: Number(offset) })
}

async function getUserById(req, res) {
  const user = await User.findById(req.params.id).select('-password').populate('followers following', 'username avatarUrl fullName')
  if (!user) return res.status(404).json({ message: 'User not found' })
  res.json(user)
}

async function updateProfile(req, res) {
  try {
    const allowed = ['fullName', 'bio', 'location', 'avatarUrl', 'sportTags', 'username']
    const updates = {}
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k] })
    /* Ensure username uniqueness if being changed */
    if (updates.username) {
      updates.username = updates.username.toLowerCase().trim()
      const conflict = await User.findOne({ username: updates.username, _id: { $ne: req.user._id } })
      if (conflict) return res.status(409).json({ message: 'Username already taken' })
    }
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select('-password')
    res.json({ user })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

async function followUser(req, res) {
  if (req.params.id === String(req.user._id))
    return res.status(400).json({ message: 'Cannot follow yourself' })

  const target = await User.findById(req.params.id)
  if (!target) return res.status(404).json({ message: 'User not found' })

  const alreadyFollowing = target.followers.includes(req.user._id)
  if (alreadyFollowing) {
    return res.status(409).json({ message: 'Already following this user', following: true, followerCount: target.followers.length })
  }
  target.followers.push(req.user._id)
  await User.findByIdAndUpdate(req.user._id, { $addToSet: { following: target._id } })
  await target.save()
  res.json({ following: true, followerCount: target.followers.length })
}

async function unfollowUser(req, res) {
  const target = await User.findById(req.params.id)
  if (!target) return res.status(404).json({ message: 'User not found' })
  target.followers.pull(req.user._id)
  await User.findByIdAndUpdate(req.user._id, { $pull: { following: target._id } })
  await target.save()
  res.json({ following: false, followerCount: target.followers.length })
}

async function getFollowers(req, res) {
  const user = await User.findById(req.params.id).populate('followers', 'username avatarUrl fullName')
  if (!user) return res.status(404).json({ message: 'User not found' })
  res.json({ followers: user.followers })
}

async function getFollowing(req, res) {
  const user = await User.findById(req.params.id).populate('following', 'username avatarUrl fullName')
  if (!user) return res.status(404).json({ message: 'User not found' })
  res.json({ following: user.following })
}

async function updateSettings(req, res) {
  const allowed = ['appearance', 'mapStyle', 'profileVisibility', 'showActivityLocation', 'showSavedRoutesPublicly', 'messagePrivacy']
  const updates = {}
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[`settings.${k}`] = req.body[k] })
  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true }).select('-password')
  res.json({ user })
}

async function changeEmail(req, res) {
  const { email } = req.body
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Please provide a valid email address' })
  const normalized = email.toLowerCase().trim()
  const conflict = await User.findOne({ email: normalized, _id: { $ne: req.user._id } })
  if (conflict) return res.status(409).json({ message: 'Email already in use' })
  const user = await User.findByIdAndUpdate(req.user._id, { email: normalized }, { new: true, runValidators: true }).select('-password')
  res.json({ user })
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Current and new password are required' })
  if (newPassword.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' })

  const user = await User.findById(req.user._id).select('+password')
  const matches = await user.matchPassword(currentPassword)
  if (!matches) return res.status(401).json({ message: 'Current password is incorrect' })

  user.password = newPassword
  await user.save()
  res.json({ message: 'Password updated successfully' })
}

async function deleteMyData(req, res) {
  const uid = req.user._id
  const activities = await Activity.find({ user: uid }).select('_id')
  const activityIds = activities.map(a => a._id)
  await Comment.deleteMany({ $or: [{ user: uid }, { activity: { $in: activityIds } }] })
  await Activity.deleteMany({ user: uid })
  await User.findByIdAndUpdate(uid, { activities: 0, totalKm: 0 })
  res.json({ message: 'Your activity data has been deleted', deletedActivities: activityIds.length })
}

async function deleteAccount(req, res) {
  const uid = req.user._id
  await Activity.deleteMany({ user: uid })
  await Comment.deleteMany({ user: uid })
  await User.updateMany({}, { $pull: { followers: uid, following: uid } })
  await User.findByIdAndDelete(uid)
  res.json({ message: 'Account deleted' })
}

module.exports = {
  getUsers, getUserById, updateProfile, followUser, unfollowUser, getFollowers, getFollowing, searchUsers,
  updateSettings, changeEmail, changePassword, deleteMyData, deleteAccount,
}
