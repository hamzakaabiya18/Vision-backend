const express = require('express')
const { getStats, getUsers, updateUserRole } = require('../controllers/adminController')
const { protect, adminOnly } = require('../middleware/authMiddleware')
const router = express.Router()

/* Every route below requires a REAL admin role from the database — never
   trust the client's selected entry mode. */
router.use(protect, adminOnly)

router.get('/stats', getStats)
router.get('/users', getUsers)
router.patch('/users/:id/role', updateUserRole)

module.exports = router
