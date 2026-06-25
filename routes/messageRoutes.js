const express = require('express')
const { getConversations, getMessages, sendMessage, getBotId } = require('../controllers/messageController')
const { protect } = require('../middleware/authMiddleware')
const router = express.Router()

router.get('/conversations',    protect, getConversations)
router.get('/bot/id',           protect, getBotId)
router.get('/:userId',          protect, getMessages)
router.post('/:userId',         protect, sendMessage)

module.exports = router
