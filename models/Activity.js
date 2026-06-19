const mongoose = require('mongoose')

const routePointSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
  t:   Number,
}, { _id: false })

const activitySchema = new mongoose.Schema({
  user:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:           { type: String, required: true, trim: true },
  sportType:       { type: String, required: true, enum: ['Run','Ride','Swim','Hike','Yoga','Gym','Ski','Climb'] },
  distanceKm:      { type: Number, default: 0 },
  durationMinutes: { type: Number, default: 0 },
  elevationGainM:  { type: Number, default: 0 },
  calories:        { type: Number, default: 0 },
  avgPace:         { type: String, default: '--:--' },
  avgSpeed:        { type: Number, default: 0 },
  location:        { type: String, default: '' },
  routePoints:     [routePointSchema],
  imageUrl:        { type: String, default: '' },
  notes:           { type: String, default: '' },
  likes:           [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  visibility:      { type: String, enum: ['public','followers','private'], default: 'public' },
}, { timestamps: true })

activitySchema.index({ user: 1, createdAt: -1 })
activitySchema.index({ sportType: 1 })
activitySchema.index({ location: 'text', title: 'text' })

module.exports = mongoose.model('Activity', activitySchema)
