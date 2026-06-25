const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema({
  sender:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body:     { type: String, required: true, trim: true },
  type:     { type: String, enum: ['text','system','bot'], default: 'text' },
  readAt:   { type: Date, default: null },
}, { timestamps: true })

messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 })

module.exports = mongoose.model('Message', messageSchema)
