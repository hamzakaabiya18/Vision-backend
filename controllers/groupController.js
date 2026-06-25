const Group = require('../models/Group')

const DEFAULT_GROUPS = [
  { name:'VISION Running Club',          description:'A community of runners pushing each other to hit new personal bests, from 5Ks to marathons.', sportType:'Running',  location:'Haifa',  coverImage:'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=700&q=80' },
  { name:'Carmel Cyclists',              description:'Road and gravel riders exploring the Carmel hills together every weekend.',                    sportType:'Cycling',  location:'Carmel', coverImage:'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=700&q=80' },
  { name:'Haifa Morning Athletes',       description:'Early risers who train together before sunrise — running, cycling, and bodyweight work.',       sportType:'Running',  location:'Haifa',  coverImage:'https://images.unsplash.com/photo-1486218119243-13883505764c?w=700&q=80' },
  { name:'VISION Hiking Crew',           description:'Weekend trail hikes across the region, from easy valley walks to demanding summit pushes.',     sportType:'Hiking',   location:'Yokneam',coverImage:'https://images.unsplash.com/photo-1551632811-561732d1e306?w=700&q=80' },
  { name:'Strength & Recovery Community',description:'Gym-goers focused on strength training, mobility work, and smart recovery between sessions.',   sportType:'Gym',      location:'Tel Aviv',coverImage:'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=700&q=80' },
]

async function ensureSeeded(adminId) {
  const count = await Group.countDocuments({ isDefault: true })
  if (count > 0 || !adminId) return
  await Group.insertMany(DEFAULT_GROUPS.map(g => ({ ...g, privacy:'open', admin: adminId, members: [adminId], isDefault: true })))
}

async function getGroups(req, res) {
  await ensureSeeded(req.user?._id)
  const { q, sport, privacy, city, location, limit = 20, offset = 0 } = req.query
  const filter = {}
  if (q)              filter.$or = [{ name: { $regex: q, $options: 'i' } }, { description: { $regex: q, $options: 'i' } }]
  if (sport)           filter.sportType = { $regex: sport, $options: 'i' }
  if (privacy)         filter.privacy   = privacy
  if (city || location) filter.location = { $regex: city || location, $options: 'i' }

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
  if (!name?.trim())        return res.status(400).json({ message: 'Group name is required' })
  if (!sportType?.trim())   return res.status(400).json({ message: 'Sport type is required' })
  if (!description?.trim()) return res.status(400).json({ message: 'Description is required' })
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

async function leaveGroup(req, res) {
  const group = await Group.findById(req.params.id)
  if (!group) return res.status(404).json({ message: 'Group not found' })
  group.members.pull(req.user._id)
  await group.save()
  res.json({ joined: false, memberCount: group.members.length })
}

module.exports = { getGroups, createGroup, getGroup, updateGroup, deleteGroup, joinGroup, leaveGroup }
