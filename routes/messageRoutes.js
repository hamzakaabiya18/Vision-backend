const express = require('express')
const { getConversations, getMessages, sendMessage } = require('../controllers/messageController')
const { protect } = require('../middleware/authMiddleware')
const router = express.Router()

router.get('/conversations',    protect, getConversations)
router.get('/:userId',          protect, getMessages)
router.post('/:userId',         protect, sendMessage)

module.exports = router
