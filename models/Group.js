const mongoose = require('mongoose')

const groupSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  sportType:   { type: String, required: true },
  location:    { type: String, default: '' },
  privacy:     { type: String, enum: ['open','invite'], default: 'open' },
  coverImage:  { type: String, default: '' },
  admin:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true })

groupSchema.index({ name: 'text', description: 'text', sportType: 1 })

module.exports = mongoose.model('Group', groupSchema)
