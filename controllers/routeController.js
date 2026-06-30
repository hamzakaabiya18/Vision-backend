const Route = require('../models/Route')
const User  = require('../models/User')

const CITY_COORDS = {
  Haifa:     { lat: 32.7940, lng: 34.9896 },
  Carmel:    { lat: 32.7300, lng: 34.9800 },
  Yokneam:   { lat: 32.6595, lng: 35.1108 },
  'Tel Aviv':{ lat: 32.0853, lng: 34.7818 },
  Jerusalem: { lat: 31.7683, lng: 35.2137 },
  Nazareth:  { lat: 32.7021, lng: 35.2978 },
}

function jitterPath(center, n = 5, spread = 0.012) {
  const pts = []
  let lat = center.lat, lng = center.lng
  for (let i = 0; i < n; i++) {
    lat += (Math.random() - 0.3) * spread
    lng += (Math.random() - 0.3) * spread
    pts.push({ lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) })
  }
  return pts
}

const SEED_ROUTES = [
  { title:'Carmel Morning Run',       sportType:'Run',  city:'Haifa',     country:'Israel', distanceKm:8.4,  estimatedDurationMinutes:48,  elevationGainM:180, difficulty:'moderate', imageUrl:'https://images.unsplash.com/photo-1486218119243-13883505764c?w=700&q=80', description:'A scenic run along the Carmel ridge with sea views and shaded forest trail sections.', popularityScore:92, tags:['scenic','forest'] },
  { title:'Haifa Coastal Ride',       sportType:'Ride', city:'Haifa',     country:'Israel', distanceKm:32.1, estimatedDurationMinutes:75,  elevationGainM:210, difficulty:'moderate', imageUrl:'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=700&q=80', description:'Flat coastal road ride hugging the Mediterranean shoreline, great for tempo efforts.', popularityScore:88, tags:['coastal','flat'] },
  { title:'Yokneam Forest Trail',     sportType:'Hike', city:'Yokneam',   country:'Israel', distanceKm:11.6, estimatedDurationMinutes:210, elevationGainM:420, difficulty:'hard',     imageUrl:'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=700&q=80', description:'Technical forest singletrack with a steady climb through pine woodland.', popularityScore:74, tags:['forest','technical'] },
  { title:'Mount Carmel Hiking Route',sportType:'Hike', city:'Carmel',    country:'Israel', distanceKm:14.2, estimatedDurationMinutes:260, elevationGainM:610, difficulty:'hard',     imageUrl:'https://images.unsplash.com/photo-1551632811-561732d1e306?w=700&q=80', description:'The classic Mount Carmel ascent — demanding but rewarding panoramic summit views.', popularityScore:81, tags:['mountain','summit'] },
  { title:'City Recovery Walk',       sportType:'Walk', city:'Haifa',     country:'Israel', distanceKm:3.5,  estimatedDurationMinutes:45,  elevationGainM:30,  difficulty:'easy',     imageUrl:'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=700&q=80', description:'An easy flat walk through the city park, ideal for active recovery days.', popularityScore:65, tags:['recovery','park'] },
  { title:'Tel Aviv Promenade Run',   sportType:'Run',  city:'Tel Aviv',  country:'Israel', distanceKm:9.8,  estimatedDurationMinutes:52,  elevationGainM:20,  difficulty:'easy',     imageUrl:'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=700&q=80', description:'Flat beachfront promenade run with consistent footing, popular at sunrise.', popularityScore:95, tags:['beach','flat'] },
  { title:'Tel Aviv Night Ride',      sportType:'Ride', city:'Tel Aviv',  country:'Israel', distanceKm:24.0, estimatedDurationMinutes:60,  elevationGainM:40,  difficulty:'easy',     imageUrl:'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=700&q=80', description:'City loop ride past the marina and old port, well-lit and beginner friendly.', popularityScore:77, tags:['city','night'] },
  { title:'Jerusalem Hills Climb',    sportType:'Ride', city:'Jerusalem', country:'Israel', distanceKm:38.4, estimatedDurationMinutes:105, elevationGainM:780, difficulty:'hard',     imageUrl:'https://images.unsplash.com/photo-1576858574144-9ae1ebcf5ae5?w=700&q=80', description:'A demanding climb through the Jerusalem hills, popular with serious cyclists.', popularityScore:70, tags:['climb','hills'] },
  { title:'Old City Walking Tour',    sportType:'Walk', city:'Jerusalem', country:'Israel', distanceKm:5.2,  estimatedDurationMinutes:70,  elevationGainM:90,  difficulty:'easy',     imageUrl:'https://images.unsplash.com/photo-1502904550040-7534597429ae?w=700&q=80', description:'Wander the historic alleys at an easy pace — light effort, rich scenery.', popularityScore:60, tags:['historic','easy'] },
  { title:'Nazareth Valley Trail',    sportType:'Hike', city:'Nazareth',  country:'Israel', distanceKm:9.0,  estimatedDurationMinutes:170, elevationGainM:340, difficulty:'moderate', imageUrl:'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=700&q=80', description:'Rolling valley trail with olive groves and gentle elevation changes.', popularityScore:58, tags:['valley','nature'] },
  { title:'Yokneam Sprint Loop',      sportType:'Run',  city:'Yokneam',   country:'Israel', distanceKm:5.0,  estimatedDurationMinutes:24,  elevationGainM:60,  difficulty:'moderate', imageUrl:'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=700&q=80', description:'A short fast loop ideal for interval and tempo sessions.', popularityScore:54, tags:['speed','loop'] },
]

async function ensureSeeded() {
  const count = await Route.countDocuments()
  if (count > 0) return
  const docs = SEED_ROUTES.map(r => ({
    ...r,
    routePoints: jitterPath(CITY_COORDS[r.city] || CITY_COORDS.Haifa),
  }))
  await Route.insertMany(docs)
}

async function getRoutes(req, res) {
  await ensureSeeded()
  const { city, sport, difficulty, q, limit = 30 } = req.query
  const filter = {}
  if (city)       filter.city = { $regex: city, $options: 'i' }
  if (sport)       filter.sportType = sport
  if (difficulty)  filter.difficulty = difficulty
  if (q)           filter.$or = [{ title: { $regex: q, $options: 'i' } }, { city: { $regex: q, $options: 'i' } }]

  const routes = await Route.find(filter).sort({ popularityScore: -1 }).limit(Number(limit))
  const userId = req.user?._id
  res.json({ routes: routes.map(r => r.toSafeObject(userId)), total: routes.length })
}

async function getRoute(req, res) {
  const route = await Route.findById(req.params.id)
  if (!route) return res.status(404).json({ message: 'Route not found' })
  res.json(route.toSafeObject(req.user?._id))
}

async function toggleSaveRoute(req, res) {
  const route = await Route.findById(req.params.id)
  if (!route) return res.status(404).json({ message: 'Route not found' })
  const saved = route.saves.some(s => String(s) === String(req.user._id))
  if (saved) {
    route.saves.pull(req.user._id)
    await User.findByIdAndUpdate(req.user._id, { $pull: { savedRoutes: route._id } })
  } else {
    route.saves.push(req.user._id)
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { savedRoutes: route._id } })
  }
  await route.save()
  res.json({ saved: !saved, savesCount: route.saves.length })
}

async function getSavedRoutes(req, res) {
  const user = await User.findById(req.user._id).populate('savedRoutes')
  const routes = (user.savedRoutes || []).map(r => r.toSafeObject(req.user._id))
  res.json({ routes })
}

module.exports = { getRoutes, getRoute, toggleSaveRoute, getSavedRoutes }
