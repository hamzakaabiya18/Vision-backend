const Message = require('../models/Message')
const User    = require('../models/User')
const mongoose = require('mongoose')
const { notifyDirectMessage } = require('../services/emailService')

/* Official VISION bot personas. Replies are simple keyword rules today,
   structured so a real AI call can replace replyFor() later without
   touching the persistence/routing logic around it. */
const BOTS = [
  { username: 'hamza_support',      persona: 'support',     fullName: 'HAMZA',  bio: 'System manager & technical support for VISION. Ask me about app issues, your account, or how to use any feature.' },
  { username: 'asaleh_coordinator', persona: 'coordinator', fullName: 'ASALEH', bio: 'Events & scheduling coordinator. Ask me about marathons, sports events near you, or planning your training schedule.', legacyUsernames: ['asala_coordinator'] },
  { username: 'may_coach',          persona: 'coach',       fullName: 'MAY',    bio: 'Senior coach & motivational mentor. Ask me for training direction, motivation, or how to push past a plateau.' },
]
const PERSONA_BY_USERNAME = BOTS.reduce((m, b) => {
  m[b.username] = b.persona
  ;(b.legacyUsernames || []).forEach(u => { m[u] = b.persona })
  return m
}, {})

async function ensureBots() {
  const bots = {}
  for (const b of BOTS) {
    let bot = await User.findOne({ username: b.username })
    if (!bot && b.legacyUsernames) {
      /* Persona was renamed (e.g. ASALA -> ASALEH) — rename the existing
         bot account in place rather than creating a duplicate, so its
         message history and conversation thread carry over. */
      bot = await User.findOne({ username: { $in: b.legacyUsernames } })
      if (bot) {
        bot.username = b.username
        bot.fullName = b.fullName
        bot.bio = b.bio
        await bot.save()
      }
    }
    if (!bot) {
      bot = await User.create({
        username: b.username,
        email: `${b.username}@vision.app`,
        password: Math.random().toString(36).slice(2) + Date.now(),
        fullName: b.fullName,
        bio: b.bio,
        isBot: true,
        verified: true,
      })
    }
    bots[b.persona] = bot
  }
  return bots
}

function botReplyFor(persona, text) {
  const t = text.toLowerCase()
 // support (HAMZA)
  if (persona === 'support') {
    if (t.includes('password') || t.includes('login') || t.includes('sign in'))
      return "Thanks for reaching out. While the VISION Admin Support team reviews your message, here's a quick pointer: you can reset your password from Profile to Settings to Account."
    if (t.includes('bug') || t.includes('error') || t.includes('crash') || t.includes('broken') || t.includes('problem'))
      return "Thanks for the report. Your message has been sent to the VISION support team - admin support will review it and respond as soon as possible."
    if (t.includes('profile') || t.includes('settings') || t.includes('avatar'))
      return 'Thanks for reaching out. Your message has been sent to the VISION support team. In the meantime, profile and preferences live under Profile to Settings.'
    return 'Thanks for reaching out. Your message has been sent to the VISION support team. Admin support will review it and respond as soon as possible.'
  }
  // coordinator (ASALEH)
  if (persona === 'coordinator') {
    if (t.includes('marathon') || t.includes('race') || t.includes('event'))
      return 'City marathons and group races usually show up in Explore Routes. Tell me your sport and city and I can point you in the right direction.'
    if (t.includes('schedule') || t.includes('plan') || t.includes('time'))
      return 'A balanced week usually mixes 3-4 training sessions with at least one full rest day. Tell me your available days and I\'ll help you sketch a simple plan.'
    if (t.includes('where') || t.includes('place') || t.includes('recommend'))
      return 'Check Explore for routes near your city, filtered by sport and difficulty - I can also suggest a sport based on how much time you have this week.'
    return "I'm ASALEH - I help with events, scheduling, and recommending where and when to train. What are you planning?"
  }

  // coach (MAY)
  if (t.includes('run'))
    return 'For your next run, try keeping the first 10 minutes easy, then increase pace gradually. Consistency beats intensity.'
  if (t.includes('cycling') || t.includes('bike') || t.includes('ride') || t.includes('cycle'))
    return 'On your next ride, focus on a steady cadence around 85-95 RPM rather than chasing top speed - it builds efficiency over time.'
  if (t.includes('tired') || t.includes('recovery') || t.includes('rest') || t.includes('sore'))
    return 'Recovery is part of performance. Consider a lighter session today, prioritize sleep, and stay hydrated.'
  if (t.includes('motivat') || t.includes('give up') || t.includes('hard') || t.includes("can't") || t.includes('cant'))
    return "Every athlete has days like this. You don't need a perfect session - you need a consistent one. Show up, even for 15 minutes, and momentum follows."
  if (t.includes('stat') || t.includes('progress'))
    return 'Your Stats page tracks distance, sessions, and trends over time - a good place to check how this week compares to last.'
  if (t.includes('hike') || t.includes('hiking') || t.includes('trail'))
    return 'For hiking, pace yourself on climbs and keep your pack light. Check Explore for trail difficulty before heading out.'
  return "I'm MAY - your coach inside VISION. Tell me how training's going and I'll help you push the right direction."
}

async function getBotIds(req, res) {
  const bots = await ensureBots()
  res.json({
    bots: Object.values(bots).map(b => ({ botId: b._id, fullName: b.fullName, username: b.username, avatarUrl: b.avatarUrl, bio: b.bio })),
  })
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
    const persona = PERSONA_BY_USERNAME[receiver.username] || 'coach'
    /* Fire-and-forget: never block or fail the user's message because
       email notification is slow/unconfigured — the message is already
       safely persisted above regardless of email outcome. Every official
       persona (HAMZA, ASALEH, MAY) has a real human behind it, so each one
       gets notified, not just "support". */
    notifyDirectMessage({ persona, recipientName: receiver.fullName, user: req.user, body, conversationId: msg._id }).catch(() => {})

    const reply = await Message.create({ sender: receiver._id, receiver: req.user._id, body: botReplyFor(persona, body), type: 'bot' })
    await reply.populate('sender receiver', 'username avatarUrl fullName')
    return res.status(201).json({ message: msg, reply })
  }

  res.status(201).json({ message: msg })
}

module.exports = { getConversations, getMessages, sendMessage, getBotIds }
