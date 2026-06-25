const express = require('express')
const {
  getUsers, getUserById, updateProfile, followUser, unfollowUser, getFollowers, getFollowing, searchUsers,
  updateSettings, changeEmail, changePassword, deleteMyData, deleteAccount,
} = require('../controllers/userController')
const { protect } = require('../middleware/authMiddleware')
const { getUserActivities } = require('../controllers/activityController')
const router = express.Router()

router.get('/',                   protect, getUsers)
router.get('/search',             protect, searchUsers)
router.get('/me',                 protect, async (req, res) => res.json({ user: req.user }))
router.patch('/me',               protect, updateProfile)   /* frontend Profile edit */
router.put('/me/profile',         protect, updateProfile)   /* legacy */
router.patch('/me/settings',      protect, updateSettings)
router.patch('/me/email',         protect, changeEmail)
router.patch('/me/password',      protect, changePassword)
router.delete('/me/data',         protect, deleteMyData)
router.delete('/me',              protect, deleteAccount)
router.get('/:id',                protect, getUserById)
router.post('/:id/follow',        protect, followUser)
router.delete('/:id/follow',      protect, unfollowUser)
router.get('/:id/followers',      protect, getFollowers)
router.get('/:id/following',      protect, getFollowing)
router.get('/:userId/activities', protect, getUserActivities)

module.exports = router
