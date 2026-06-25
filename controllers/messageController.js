const Message = require('../models/Message')
const User    = require('../models/User')
const mongoose = require('mongoose')

const BOT_EMAIL = 'vision.coach@vision.app'

async function ensureBot() {
  let bot = await User.findOne({ isBot: true })
  if (bot) return bot
  bot = await User.create({
    username: 'vision_coach',
    email: BOT_EMAIL,
    password: Math.random().toString(36).slice(2) + Date.now(),
    fullName: 'VISION Coach',
    bio: 'Your built-in athletic guidance assistant. Ask about running, cycling, recovery, routes, or stats.',
    isBot: true,
    verified: true,
  })
  return bot
}

function botReplyFor(text) {
  const t = text.toLowerCase()
  if (t.includes('run'))
    return 'For your next run, try keeping the first 10 minutes easy, then increase pace gradually. Consistency beats intensity.'
  if (t.includes('cycl') || t.includes('bike') || t.includes('ride'))
    return 'On your next ride, focus on a steady cadence around 85-95 RPM rather than chasing top speed — it builds efficiency over time.'
  if (t.includes('tired') || t.includes('recovery') || t.includes('rest') || t.includes('sore'))
    return 'Recovery is part of performance. Consider a lighter session today, prioritize sleep, and stay hydrated.'
  if (t.includes('route'))
    return 'Explore can help you find nearby routes that match your sport and distance — check the Explore tab for recommendations near your city.'
  if (t.includes('stat') || t.includes('progress'))
    return 'Your Stats page tracks distance, sessions, and trends over time — a good place to check how this week compares to last.'
  if (t.includes('hike') || t.includes('hiking') || t.includes('trail'))
    return 'For hiking, pace yourself on climbs and keep your pack light. Check Explore for trail difficulty before heading out.'
  return "I'm VISION Coach — ask me about running, cycling, hiking, recovery, routes, or stats, and I'll share quick guidance."
}

async function getBotId(req, res) {
  const bot = await ensureBot()
  res.json({ botId: bot._id, fullName: bot.fullName, avatarUrl: bot.avatarUrl })
}

const SAFE_USER_FIELDS = { username: 1, fullName: 1, avatarUrl: 1, isBot: 1 }

async function getConversations(req, res) {
  const uid = req.user._id
  const convos = await Message.aggregate([
    { $match: { $or: [{ sender: uid }, { receiver: uid }] } },
    { $sort: { createdAt: -1 } },
    { $group: {
      _id: {
        $cond: [{ $lt: ['$sender', '$receiver'] },
          { a: '$sender', b: '$receiver' },
          { a: '$receiver', b: '$sender' }]
      },
      lastMessage: { $first: '$$ROOT' },
      unreadCount: { $sum: { $cond: [{ $and: [{ $eq: ['$receiver', uid] }, { $eq: ['$readAt', null] }] }, 1, 0] } },
    }},
    { $addFields: { 'lastMessage.unreadCount': '$unreadCount' } },
    { $replaceRoot: { newRoot: '$lastMessage' } },
    { $lookup: { from: 'users', localField: 'sender',   foreignField: '_id', as: 'senderObj',   pipeline: [{ $project: SAFE_USER_FIELDS }] } },
    { $lookup: { from: 'users', localField: 'receiver', foreignField: '_id', as: 'receiverObj', pipeline: [{ $project: SAFE_USER_FIELDS }] } },
    { $addFields: {
      otherUser: {
        $cond: [{ $eq: ['$sender', uid] }, { $arrayElemAt: ['$receiverObj', 0] }, { $arrayElemAt: ['$senderObj', 0] }],
      },
    }},
    { $project: { senderObj: 0, receiverObj: 0 } },
    { $sort: { createdAt: -1 } },
    { $limit: 30 },
  ])
  res.json(convos)
}

async function getMessages(req, res) {
  const uid    = req.user._id
  const otherId = new mongoose.Types.ObjectId(req.params.userId)
  const { limit = 50, offset = 0 } = req.query

  const msgs = await Message.find({
    $or: [{ sender: uid, receiver: otherId }, { sender: otherId, receiver: uid }]
  })
    .populate('sender receiver', 'username avatarUrl fullName')
    .sort({ createdAt: -1 })
    .skip(Number(offset))
    .limit(Number(limit))

  // mark as read
  await Message.updateMany({ sender: otherId, receiver: uid, readAt: null }, { readAt: new Date() })

  res.json(msgs.reverse())
}

async function sendMessage(req, res) {
  const body = (req.body.body || '').trim()
  if (!body) return res.status(400).json({ message: 'Message cannot be empty' })
  if (body.length > 1000) return res.status(400).json({ message: 'Message is too long' })
  if (req.params.userId === String(req.user._id)) return res.status(400).json({ message: 'Cannot message yourself' })

  const receiver = await User.findById(req.params.userId)
  if (!receiver) return res.status(404).json({ message: 'User not found' })

  const msg = await Message.create({ sender: req.user._id, receiver: receiver._id, body })
  await msg.populate('sender receiver', 'username avatarUrl fullName')

  if (receiver.isBot) {
    const reply = await Message.create({ sender: receiver._id, receiver: req.user._id, body: botReplyFor(body), type: 'bot' })
    await reply.populate('sender receiver', 'username avatarUrl fullName')
    return res.status(201).json({ message: msg, reply })
  }

  res.status(201).json({ message: msg })
}

module.exports = { getConversations, getMessages, sendMessage, getBotId }
