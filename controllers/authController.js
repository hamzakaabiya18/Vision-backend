const jwt  = require('jsonwebtoken')
const User = require('../models/User')

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' })
}

/* ── Register ── */
async function register(req, res) {
  try {
    const { username, email, password, fullName, sports } = req.body
    if (!username || !email || !password || !fullName)
      return res.status(400).json({ message: 'All fields are required' })

    const exists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] })
    if (exists) return res.status(409).json({ message: 'Username or email already taken' })

    const user = await User.create({
      username:  username.toLowerCase(),
      email:     email.toLowerCase(),
      password,
      fullName,
      sportTags: sports || [],
    })
    res.status(201).json({ token: signToken(user._id), user: user.toSafeObject() })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

/* ── Login — accepts email OR username ── */
async function login(req, res) {
  try {
    const { emailOrUsername, password, email } = req.body
    const ident = (emailOrUsername || email || '').toLowerCase().trim()
    if (!ident || !password)
      return res.status(400).json({ message: 'Please provide credentials' })

    /* Find by email or username */
    const user = await User.findOne({
      $or: [{ email: ident }, { username: ident }],
    }).select('+password')

    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid email/username or password' })

    res.json({ token: signToken(user._id), user: user.toSafeObject() })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

/* ── Get current user (token-based session restore) ── */
async function getMe(req, res) {
  try {
    /* req.user is set by authMiddleware; re-fetch fresh from DB */
    const user = await User.findById(req.user._id || req.user.id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json({ user: user.toSafeObject() })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

/* ── Signup alias ── */
const signup = register

module.exports = { register, signup, login, getMe }
