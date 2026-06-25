const Activity = require('../models/Activity')
const User     = require('../models/User')

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const DEMO_ATHLETES = [
  { fullName:'Marcus Chen',    username:'marcus_runs',   email:'marcus.demo@vision.app',  avatarUrl:'https://images.unsplash.com/photo-1499996860823-5214fcc65f8f?w=80&q=80', sportType:'Run',  monthlyKm:[58,72,80,69,91,104] },
  { fullName:'Sara Valeri',    username:'sara_cycles',   email:'sara.demo@vision.app',    avatarUrl:'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80', sportType:'Ride', monthlyKm:[110,98,120,105,131,140] },
  { fullName:'Leo Brooks',     username:'leo_trails',    email:'leo.demo@vision.app',     avatarUrl:'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&q=80', sportType:'Hike', monthlyKm:[40,52,38,61,55,70] },
  { fullName:'Nadia Kowalski', username:'nadia_tri',     email:'nadia.demo@vision.app',   avatarUrl:'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&q=80', sportType:'Swim', monthlyKm:[80,75,90,84,96,88] },
  { fullName:'Amara Diallo',   username:'amara_sprints', email:'amara.demo@vision.app',   avatarUrl:'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&q=80', sportType:'Run',  monthlyKm:[60,58,71,66,80,77] },
]

async function ensureDemoAthletes() {
  const existing = await User.countDocuments({ isDemoAthlete: true })
  if (existing >= DEMO_ATHLETES.length) return

  for (const a of DEMO_ATHLETES) {
    let user = await User.findOne({ username: a.username })
    if (!user) {
      user = await User.create({
        fullName: a.fullName, username: a.username, email: a.email,
        password: Math.random().toString(36).slice(2) + Date.now(),
        avatarUrl: a.avatarUrl, isDemoAthlete: true, verified: true,
        sportTags: [a.sportType],
      })
    }
    const hasActivities = await Activity.exists({ user: user._id })
    if (!hasActivities) {
      const now = new Date()
      const docs = a.monthlyKm.map((km, i) => {
        const monthsAgo = a.monthlyKm.length - 1 - i
        const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 10)
        return {
          user: user._id,
          title: `${a.sportType} session`,
          sportType: a.sportType,
          distanceKm: km,
          durationMinutes: Math.round(km * 5.5),
          calories: Math.round(km * 60),
          createdAt: date,
          updatedAt: date,
        }
      })
      await Activity.insertMany(docs)
      const totalKm = a.monthlyKm.reduce((s, k) => s + k, 0)
      await User.findByIdAndUpdate(user._id, { totalKm, activities: docs.length })
    }
  }
}

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
  await ensureDemoAthletes()

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
