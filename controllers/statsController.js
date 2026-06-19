const Activity = require('../models/Activity')
const User     = require('../models/User')

async function getMyStats(req, res) {
  const uid = req.user._id

  const [sportBreakdown, monthlyDistance, recentActivities, totals] = await Promise.all([
    Activity.aggregate([
      { $match: { user: uid } },
      { $group: { _id: '$sportType', count: { $sum: 1 }, totalKm: { $sum: '$distanceKm' }, totalMin: { $sum: '$durationMinutes' } } },
      { $sort: { totalKm: -1 } },
    ]),
    Activity.aggregate([
      { $match: { user: uid, createdAt: { $gte: new Date(Date.now() - 365*24*60*60*1000) } } },
      { $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        totalKm: { $sum: '$distanceKm' },
        count:   { $sum: 1 },
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Activity.find({ user: uid }).sort({ createdAt: -1 }).limit(5).populate('user', 'username avatarUrl'),
    Activity.aggregate([
      { $match: { user: uid } },
      { $group: { _id: null, totalKm: { $sum: '$distanceKm' }, totalMin: { $sum: '$durationMinutes' }, totalCal: { $sum: '$calories' }, count: { $sum: 1 } } },
    ]),
  ])

  res.json({ sportBreakdown, monthlyDistance, recentActivities, totals: totals[0] || {} })
}

async function getGlobalStats(req, res) {
  const [topRunners, sportTotals, platformTotals] = await Promise.all([
    User.find().sort({ totalKm: -1 }).limit(10).select('username fullName avatarUrl totalKm activities'),
    Activity.aggregate([
      { $group: { _id: '$sportType', count: { $sum: 1 }, totalKm: { $sum: '$distanceKm' } } },
      { $sort: { count: -1 } },
    ]),
    Activity.aggregate([
      { $group: { _id: null, totalKm: { $sum: '$distanceKm' }, count: { $sum: 1 } } },
    ]),
  ])

  const userCount = await User.countDocuments()
  res.json({ topRunners, sportTotals, platformTotals: platformTotals[0] || {}, userCount })
}

module.exports = { getMyStats, getGlobalStats }
