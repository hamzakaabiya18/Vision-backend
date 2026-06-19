const express = require('express')
const { getUsers, getUserById, updateProfile, followUser } = require('../controllers/userController')
const { protect } = require('../middleware/authMiddleware')
const { getUserActivities } = require('../controllers/activityController')
const router = express.Router()

router.get('/',                   protect, getUsers)
router.get('/me',                 protect, async (req, res) => res.json({ user: req.user }))
router.patch('/me',               protect, updateProfile)   /* frontend Profile edit */
router.put('/me/profile',         protect, updateProfile)   /* legacy */
router.get('/:id',                protect, getUserById)
router.post('/:id/follow',        protect, followUser)
router.get('/:userId/activities', protect, getUserActivities)

module.exports = router
