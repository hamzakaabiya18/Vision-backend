const express = require('express')
const { getRoutes, getRoute, toggleSaveRoute, getSavedRoutes } = require('../controllers/routeController')
const { protect } = require('../middleware/authMiddleware')
const router = express.Router()

router.get('/saved',     protect, getSavedRoutes)
router.get('/',          protect, getRoutes)
router.get('/:id',       protect, getRoute)
router.post('/:id/save', protect, toggleSaveRoute)
router.delete('/:id/save', protect, toggleSaveRoute)

module.exports = router
