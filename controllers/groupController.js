const Group = require('../models/Group')

async function getGroups(req, res) {
  const { q, sport, privacy, limit = 20, offset = 0 } = req.query
  const filter = {}
  if (q)       filter.$or = [{ name: { $regex: q, $options: 'i' } }, { description: { $regex: q, $options: 'i' } }]
  if (sport)   filter.sportType = { $regex: sport, $options: 'i' }
  if (privacy) filter.privacy   = privacy

  const total  = await Group.countDocuments(filter)
  const groups = await Group.find(filter)
    .populate('admin', 'username avatarUrl fullName')
    .populate('members', 'username avatarUrl')
    .sort({ createdAt: -1 })
    .skip(Number(offset))
    .limit(Number(limit))
  res.json({ groups, total })
}

async function createGroup(req, res) {
  const { name, description, sportType, location, privacy, coverImage } = req.body
  if (!name || !sportType) return res.status(400).json({ message: 'name and sportType are required' })
  const group = await Group.create({ name, description, sportType, location, privacy, coverImage, admin: req.user._id, members: [req.user._id] })
  await group.populate('admin', 'username avatarUrl fullName')
  res.status(201).json(group)
}

async function getGroup(req, res) {
  const group = await Group.findById(req.params.id)
    .populate('admin', 'username avatarUrl fullName')
    .populate('members', 'username avatarUrl fullName')
  if (!group) return res.status(404).json({ message: 'Group not found' })
  res.json(group)
}

async function updateGroup(req, res) {
  const group = await Group.findById(req.params.id)
  if (!group) return res.status(404).json({ message: 'Group not found' })
  if (String(group.admin) !== String(req.user._id))
    return res.status(403).json({ message: 'Only the group admin can update' })
  const allowed = ['name', 'description', 'sportType', 'location', 'privacy', 'coverImage']
  allowed.forEach(k => { if (req.body[k] !== undefined) group[k] = req.body[k] })
  await group.save()
  res.json(group)
}

async function deleteGroup(req, res) {
  const group = await Group.findById(req.params.id)
  if (!group) return res.status(404).json({ message: 'Group not found' })
  if (String(group.admin) !== String(req.user._id) && req.user.role !== 'admin')
    return res.status(403).json({ message: 'Not authorised' })
  await group.deleteOne()
  res.json({ message: 'Group deleted' })
}

async function joinGroup(req, res) {
  const group = await Group.findById(req.params.id)
  if (!group) return res.status(404).json({ message: 'Group not found' })
  const isMember = group.members.includes(req.user._id)
  if (isMember) {
    group.members.pull(req.user._id)
  } else {
    group.members.push(req.user._id)
  }
  await group.save()
  res.json({ joined: !isMember, memberCount: group.members.length })
}

module.exports = { getGroups, createGroup, getGroup, updateGroup, deleteGroup, joinGroup }
