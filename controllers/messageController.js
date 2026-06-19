const Message = require('../models/Message')
const mongoose = require('mongoose')

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
    }},
    { $replaceRoot: { newRoot: '$lastMessage' } },
    { $lookup: { from: 'users', localField: 'sender',   foreignField: '_id', as: 'senderObj' } },
    { $lookup: { from: 'users', localField: 'receiver', foreignField: '_id', as: 'receiverObj' } },
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
  const { body } = req.body
  if (!body) return res.status(400).json({ message: 'Message body required' })
  const msg = await Message.create({ sender: req.user._id, receiver: req.params.userId, body })
  await msg.populate('sender receiver', 'username avatarUrl fullName')
  res.status(201).json(msg)
}

module.exports = { getConversations, getMessages, sendMessage }
