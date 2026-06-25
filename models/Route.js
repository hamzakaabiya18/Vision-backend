const mongoose = require('mongoose')

const routePointSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
}, { _id: false })

const routeSchema = new mongoose.Schema({
  title:                    { type: String, required: true, trim: true },
  sportType:                { type: String, required: true, enum: ['Run','Ride','Hike','Walk'] },
  city:                     { type: String, required: true, trim: true },
  country:                  { type: String, default: '' },
  distanceKm:               { type: Number, default: 0 },
  estimatedDurationMinutes: { type: Number, default: 0 },
  elevationGainM:           { type: Number, default: 0 },
  difficulty:               { type: String, enum: ['easy','moderate','hard'], default: 'moderate' },
  imageUrl:                 { type: String, default: '' },
  routePoints:              [routePointSchema],
  description:              { type: String, default: '' },
  popularityScore:          { type: Number, default: 0 },
  saves:                    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy:                { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tags:                     [{ type: String }],
}, { timestamps: true })

routeSchema.index({ city: 'text', title: 'text' })
routeSchema.index({ sportType: 1 })

routeSchema.methods.toSafeObject = function (userId) {
  const obj = this.toObject()
  obj.savesCount = Array.isArray(obj.saves) ? obj.saves.length : 0
  obj.savedByMe  = userId ? obj.saves.some(s => String(s) === String(userId)) : false
  return obj
}

module.exports = mongoose.model('Route', routeSchema)
