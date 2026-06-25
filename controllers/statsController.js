const Activity = require('../models/Activity')
const User     = require('../models/User')

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtPace(totalMin, totalKm) {
  if (!totalKm || !totalMin) return '--:--'
  const paceMin = totalMin / totalKm
  const m = Math.floor(paceMin), s = Math.round((paceMin - m) * 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

async function getMyStats(req, res) {
  const uid = req.user._id

  const [sportBreakdown, monthlyAgg, weeklyAgg, totalsAgg, myTotalKm] = await Promise.all([
    Activity.aggregate([
      { $match: { user: uid } },
      { $group: { _id: '$sportType', sessions: { $sum: 1 }, totalKm: { $sum: '$distanceKm' }, totalMin: { $sum: '$durationMinutes' } } },
      { $sort: { totalKm: -1 } },
    ]),
    Activity.aggregate([
      { $match: { user: uid, createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } },
      { $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        km: { $sum: '$distanceKm' },
        calories: { $sum: '$calories' },
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Activity.aggregate([
      { $match: { user: uid, createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dayOfWeek: '$createdAt' }, count: { $sum: 1 } } },
    ]),
    Activity.aggregate([
      { $match: { user: uid } },
      { $group: { _id: null, totalKm: { $sum: '$distanceKm' }, totalMin: { $sum: '$durationMinutes' }, totalCal: { $sum: '$calories' }, count: { $sum: 1 } } },
    ]),
    User.findById(uid).select('totalKm'),
  ])

  const totals = totalsAgg[0] || { totalKm: 0, totalMin: 0, totalCal: 0, count: 0 }
  const favoriteSport = sportBreakdown[0]?._id || null

  const monthlyDistance = monthlyAgg.map(m => ({ month: MONTH_NAMES[m._id.month - 1], km: Math.round(m.km * 10) / 10, calories: Math.round(m.calories) }))

  const DAY_LABELS = ['S','M','T','W','T','F','S']
  const weeklyFrequency = DAY_LABELS.map((label, i) => {
    const found = weeklyAgg.find(w => w._id === i + 1)
    return { day: label, count: found ? found.count : 0 }
  })

  const usersAheadCount = await User.countDocuments({ totalKm: { $gt: totals.totalKm } })
  const totalUsers = await User.countDocuments()
  const rank = usersAheadCount + 1

  res.json({
    user: { fullName: req.user.fullName, username: req.user.username, avatarUrl: req.user.avatarUrl },
    totals: {
      totalDistanceKm: Math.round(totals.totalKm * 10) / 10,
      totalDurationMinutes: totals.totalMin,
      totalActivities: totals.count,
      totalCalories: Math.round(totals.totalCal),
      avgPace: fmtPace(totals.totalMin, totals.totalKm),
      avgSpeedKmh: totals.totalMin ? Math.round((totals.totalKm / (totals.totalMin / 60)) * 10) / 10 : 0,
      favoriteSport,
    },
    sportBreakdown,
    monthlyDistance,
    weeklyFrequency,
    rank,
    totalUsers,
    aheadOfCount: Math.max(totalUsers - rank, 0),
  })
}

async function getGlobalStats(req, res) {
  const topRunners = await User.find({ isBot: { $ne: true } })
    .sort({ totalKm: -1 })
    .limit(10)
    .select('username fullName avatarUrl totalKm activities')

  const userIds = topRunners.map(u => u._id)

  const [monthlyByUser, favSportByUser] = await Promise.all([
    Activity.aggregate([
      { $match: { user: { $in: userIds }, createdAt: { $gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { user: '$user', year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, km: { $sum: '$distanceKm' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Activity.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: { user: '$user', sport: '$sportType' }, totalKm: { $sum: '$distanceKm' } } },
      { $sort: { totalKm: -1 } },
    ]),
  ])

  const sparklineByUser = {}
  monthlyByUser.forEach(m => {
    const uid = String(m._id.user)
    if (!sparklineByUser[uid]) sparklineByUser[uid] = []
    sparklineByUser[uid].push(Math.round(m.km * 10) / 10)
  })

  const favSportSeen = {}
  favSportByUser.forEach(f => {
    const uid = String(f._id.user)
    if (!favSportSeen[uid]) favSportSeen[uid] = f._id.sport
  })

  const leaders = topRunners.map((u, i) => ({
    rank: i + 1,
    _id: u._id,
    fullName: u.fullName,
    username: u.username,
    avatarUrl: u.avatarUrl,
    totalKm: u.totalKm || 0,
    totalActivities: u.activities || 0,
    favoriteSport: favSportSeen[String(u._id)] || null,
    sparkline: sparklineByUser[String(u._id)] || [],
  }))

  res.json({ leaders, userCount: await User.countDocuments({ isBot: { $ne: true } }) })
}

module.exports = { getMyStats, getGlobalStats }
