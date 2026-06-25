const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
  username:   { type: String, required: true, unique: true, trim: true, lowercase: true },
  email:      { type: String, required: true, unique: true, trim: true, lowercase: true },
  password:   { type: String, required: true, select: false },
  fullName:   { type: String, required: true, trim: true },
  avatarUrl:  { type: String, default: '' },
  bio:        { type: String, default: '', maxlength: 200 },
  location:   { type: String, default: '' },
  sportTags:  [{ type: String }],
  totalKm:    { type: Number, default: 0 },
  activities: { type: Number, default: 0 },
  followers:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  savedRoutes:[{ type: mongoose.Schema.Types.ObjectId, ref: 'Route' }],
  role:       { type: String, enum: ['user', 'admin'], default: 'user' },
  verified:   { type: Boolean, default: false },
  online:     { type: Boolean, default: false },
  isBot:      { type: Boolean, default: false },
  isDemoAthlete: { type: Boolean, default: false },
  settings: {
    appearance:              { type: String, enum: ['light','dark','system'], default: 'light' },
    mapStyle:                { type: String, enum: ['standard','satellite','terrain'], default: 'standard' },
    profileVisibility:       { type: String, enum: ['public','private'], default: 'public' },
    showActivityLocation:    { type: Boolean, default: true },
    showSavedRoutesPublicly: { type: Boolean, default: true },
    messagePrivacy:          { type: String, enum: ['everyone','followers'], default: 'everyone' },
  },
}, { timestamps: true })

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password)
}

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject()
  delete obj.password
  /* Add derived count fields expected by the frontend */
  obj.followersCount  = Array.isArray(obj.followers) ? obj.followers.length : 0
  obj.followingCount  = Array.isArray(obj.following) ? obj.following.length : 0
  obj.activitiesCount = obj.activities || 0
  return obj
}

module.exports = mongoose.model('User', userSchema)
