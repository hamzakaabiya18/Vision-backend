const express = require('express')
const {
  getFeed, searchActivities, createActivity, getActivity,
  updateActivity, deleteActivity, likeActivity, addComment,
} = require('../controllers/activityController')
const { protect } = require('../middleware/authMiddleware')
const router = express.Router()

router.get('/feed',        protect, getFeed)
router.get('/search',      protect, searchActivities)
router.post('/',           protect, createActivity)
router.get('/:id',         protect, getActivity)
router.put('/:id',         protect, updateActivity)
router.delete('/:id',      protect, deleteActivity)
router.post('/:id/like',     protect, likeActivity)
router.post('/:id/comment',  protect, addComment)
router.post('/:id/comments', protect, addComment)   /* alias */
router.get('/:id/comments',  protect, getActivity)  /* returns activity incl. populated comments */

module.exports = router
