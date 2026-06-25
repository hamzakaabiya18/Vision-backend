require('dotenv').config()
const express   = require('express')
const http      = require('http')
const { Server } = require('socket.io')
const cors      = require('cors')
const connectDB = require('./config/db')
const { notFound, errorHandler } = require('./middleware/errorMiddleware')

const authRoutes     = require('./routes/authRoutes')
const userRoutes     = require('./routes/userRoutes')
const activityRoutes = require('./routes/activityRoutes')
const groupRoutes    = require('./routes/groupRoutes')
const messageRoutes  = require('./routes/messageRoutes')
const statsRoutes    = require('./routes/statsRoutes')
const routeRoutes    = require('./routes/routeRoutes')

connectDB()

const app    = express()
const server = http.createServer(app)

const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
]

/* Allow any Vercel deployment (production + per-branch/preview URLs) in
   addition to the fixed local dev origins above. */
function isAllowedOrigin(origin) {
  if (!origin) return true // same-origin / non-browser requests (curl, server-to-server)
  if (allowedOrigins.includes(origin)) return true
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return true
  return false
}

const corsOriginCheck = (origin, callback) => {
  if (isAllowedOrigin(origin)) callback(null, true)
  else callback(new Error(`Not allowed by CORS: ${origin}`))
}

const io = new Server(server, {
  cors: { origin: corsOriginCheck, methods: ['GET','POST'] },
})

/* ── Socket.io real-time chat ── */
const onlineUsers = new Map()

io.on('connection', (socket) => {
  socket.on('user:join', (userId) => {
    onlineUsers.set(userId, socket.id)
    socket.userId = userId
    io.emit('users:online', [...onlineUsers.keys()])
  })

  socket.on('message:send', (data) => {
    const { receiverId, message } = data
    const receiverSocket = onlineUsers.get(receiverId)
    if (receiverSocket) {
      io.to(receiverSocket).emit('message:receive', message)
    }
  })

  socket.on('typing:start', ({ receiverId }) => {
    const receiverSocket = onlineUsers.get(receiverId)
    if (receiverSocket) io.to(receiverSocket).emit('typing:start', { senderId: socket.userId })
  })

  socket.on('typing:stop', ({ receiverId }) => {
    const receiverSocket = onlineUsers.get(receiverId)
    if (receiverSocket) io.to(receiverSocket).emit('typing:stop', { senderId: socket.userId })
  })

  socket.on('disconnect', () => {
    if (socket.userId) onlineUsers.delete(socket.userId)
    io.emit('users:online', [...onlineUsers.keys()])
  })
})

/* ── Middleware ── */
app.use(cors({ origin: corsOriginCheck, credentials: true }))
app.use(express.json({ limit: '2mb' }))

/* ── Routes ── */
app.use('/api/auth',       authRoutes)
app.use('/api/users',      userRoutes)
app.use('/api/activities', activityRoutes)
app.use('/api/groups',     groupRoutes)
app.use('/api/messages',   messageRoutes)
app.use('/api/stats',      statsRoutes)
app.use('/api/routes',     routeRoutes)

app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 5000
server.listen(PORT, () => console.log(`VISION server running on port ${PORT}`))
