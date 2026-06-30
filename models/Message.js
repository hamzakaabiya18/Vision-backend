const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema({
  sender:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body:     { type: String, required: true, trim: true },
  type:     { type: String, enum: ['text','system','bot'], default: 'text' },
  readAt:   { type: Date, default: null },
  /* Set only on messages sent TO an official support persona (HAMZA /
     ASALEH / MAY), so a real admin notification can be audited even if
     the email itself failed or SMTP was never configured. */
  isSupportMessage: { type: Boolean, default: false },
  supportRecipient: { type: String, default: null },
  emailSent:         { type: Boolean, default: false },
  emailError:        { type: String, default: null },
}, { timestamps: true })

messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 })

module.exports = mongoose.model('Message', messageSchema)
