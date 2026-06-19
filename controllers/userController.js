const User = require('../models/User')

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
    target.followers.pull(req.user._id)
    await User.findByIdAndUpdate(req.user._id, { $pull: { following: target._id } })
  } else {
    target.followers.push(req.user._id)
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { following: target._id } })
  }
  await target.save()
  res.json({ following: !alreadyFollowing, followerCount: target.followers.length })
}

module.exports = { getUsers, getUserById, updateProfile, followUser }
