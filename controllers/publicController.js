const Activity = require('../models/Activity')
const Route    = require('../models/Route')

/* Unauthenticated, guest-safe preview. Returns only public-visibility
   activities and public route data — never private user fields. */
async function getPublicPreview(req, res) {
  const { sport } = req.query

  const activityFilter = { visibility: 'public' }
  if (sport) activityFilter.sportType = sport
  const routeFilter = {}
  if (sport) routeFilter.sportType = sport

  const [activities, routes] = await Promise.all([
    Activity.find(activityFilter)
      .sort({ createdAt: -1 })
      .limit(12)
      .select('title sportType distanceKm durationMinutes imageUrl location createdAt')
      .populate('user', 'username fullName avatarUrl'),
    Route.find(routeFilter)
      .sort({ popularityScore: -1 })
      .limit(8)
      .select('title sportType city distanceKm difficulty imageUrl popularityScore'),
  ])
  res.json({ activities, routes })
}

module.exports = { getPublicPreview }
