const mongoose = require('mongoose')

const commentSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  activity: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
  body:     { type: String, required: true, trim: true, maxlength: 500 },
}, { timestamps: true })

module.exports = mongoose.model('Comment', commentSchema)
