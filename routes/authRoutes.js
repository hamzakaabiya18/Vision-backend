const express = require('express')
const { register, signup, login, getMe } = require('../controllers/authController')
const { protect } = require('../middleware/authMiddleware')
const router = express.Router()

router.post('/register', register)
router.post('/signup',   signup)   /* alias used by frontend */
router.post('/login',    login)
router.get('/me',        protect, getMe)

module.exports = router
