const express = require('express')
const { getGroups, createGroup, getGroup, updateGroup, deleteGroup, joinGroup, leaveGroup, removeMember } = require('../controllers/groupController')
const { protect } = require('../middleware/authMiddleware')
const router = express.Router()

router.get('/',                    protect, getGroups)
router.post('/',                   protect, createGroup)
router.get('/:id',                 protect, getGroup)
router.put('/:id',                 protect, updateGroup)
router.delete('/:id',              protect, deleteGroup)
router.post('/:id/join',           protect, joinGroup)
router.delete('/:id/leave',        protect, leaveGroup)
router.delete('/:id/members/:userId', protect, removeMember)

module.exports = router
