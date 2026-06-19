const Activity = require('../models/Activity')
const Comment  = require('../models/Comment')
const User     = require('../models/User')

async function getFeed(req, res) {
  const { limit = 20, offset = 0 } = req.query
  const following = req.user.following.concat(req.user._id)
  const activities = await Activity.find({ user: { $in: following }, visibility: { $ne: 'private' } })
    .populate('user', 'username fullName avatarUrl verified')
    .populate({ path: 'comments', populate: { path: 'user', select: 'username avatarUrl' } })
    .sort({ createdAt: -1 })
    .skip(Number(offset))
    .limit(Number(limit))
  const total = await Activity.countDocuments({ user: { $in: following }, visibility: { $ne: 'private' } })
  res.json({ activities, total })
}

async function searchActivities(req, res) {
  const { q, sport, minDist, maxDist, location, limit = 20, offset = 0 } = req.query
  const filter = { visibility: 'public' }
  if (q)        filter.$or = [{ title: { $regex: q, $options: 'i' } }, { notes: { $regex: q, $options: 'i' } }]
  if (sport)    filter.sportType = sport
  if (location) filter.location  = { $regex: location, $options: 'i' }
  if (minDist)  filter.distanceKm = { ...filter.distanceKm, $gte: Number(minDist) }
  if (maxDist)  filter.distanceKm = { ...filter.distanceKm, $lte: Number(maxDist) }

  const total = await Activity.countDocuments(filter)
  const activities = await Activity.find(filter)
    .populate('user', 'username fullName avatarUrl verified')
    .sort({ createdAt: -1 })
    .skip(Number(offset))
    .limit(Number(limit))
  res.json({ activities, total })
}

async function createActivity(req, res) {
  const activity = await Activity.create({ ...req.body, user: req.user._id })
  await User.findByIdAndUpdate(req.user._id, {
    $inc: { activities: 1, totalKm: activity.distanceKm || 0 }
  })
  res.status(201).json(activity)
}

async function getActivity(req, res) {
  const activity = await Activity.findById(req.params.id)
    .populate('user', 'username fullName avatarUrl verified')
    .populate({ path: 'comments', populate: { path: 'user', select: 'username avatarUrl fullName' } })
  if (!activity) return res.status(404).json({ message: 'Activity not found' })
  res.json(activity)
}

async function updateActivity(req, res) {
  const activity = await Activity.findById(req.params.id)
  if (!activity) return res.status(404).json({ message: 'Activity not found' })
  if (String(activity.user) !== String(req.user._id))
    return res.status(403).json({ message: 'Not authorised' })
  const allowed = ['title', 'notes', 'visibility', 'imageUrl']
  allowed.forEach(k => { if (req.body[k] !== undefined) activity[k] = req.body[k] })
  await activity.save()
  res.json(activity)
}

async function deleteActivity(req, res) {
  const activity = await Activity.findById(req.params.id)
  if (!activity) return res.status(404).json({ message: 'Activity not found' })
  if (String(activity.user) !== String(req.user._id) && req.user.role !== 'admin')
    return res.status(403).json({ message: 'Not authorised' })
  await User.findByIdAndUpdate(activity.user, { $inc: { activities: -1, totalKm: -(activity.distanceKm || 0) } })
  await activity.deleteOne()
  res.json({ message: 'Activity deleted' })
}

async function likeActivity(req, res) {
  const activity = await Activity.findById(req.params.id)
  if (!activity) return res.status(404).json({ message: 'Activity not found' })
  const liked = activity.likes.includes(req.user._id)
  if (liked) activity.likes.pull(req.user._id)
  else        activity.likes.push(req.user._id)
  await activity.save()
  res.json({ liked: !liked, likeCount: activity.likes.length })
}

async function addComment(req, res) {
  const { body } = req.body
  if (!body) return res.status(400).json({ message: 'Comment body is required' })
  const activity = await Activity.findById(req.params.id)
  if (!activity) return res.status(404).json({ message: 'Activity not found' })
  const comment = await Comment.create({ user: req.user._id, activity: activity._id, body })
  activity.comments.push(comment._id)
  await activity.save()
  await comment.populate('user', 'username avatarUrl fullName')
  res.status(201).json(comment)
}

async function getUserActivities(req, res) {
  const { limit = 20, offset = 0 } = req.query
  const activities = await Activity.find({ user: req.params.userId, visibility: { $ne: 'private' } })
    .populate('user', 'username fullName avatarUrl')
    .sort({ createdAt: -1 })
    .skip(Number(offset))
    .limit(Number(limit))
  const total = await Activity.countDocuments({ user: req.params.userId, visibility: { $ne: 'private' } })
  res.json({ activities, total })
}

module.exports = { getFeed, searchActivities, createActivity, getActivity, updateActivity, deleteActivity, likeActivity, addComment, getUserActivities }
