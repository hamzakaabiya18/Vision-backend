const express = require('express')
const { getMyStats, getGlobalStats } = require('../controllers/statsController')
const { protect } = require('../middleware/authMiddleware')
const router = express.Router()

router.get('/me',     protect, getMyStats)
router.get('/global', protect, getGlobalStats)

module.exports = router
