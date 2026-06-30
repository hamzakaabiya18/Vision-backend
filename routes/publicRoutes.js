const express = require('express')
const { getPublicPreview } = require('../controllers/publicController')
const router = express.Router()

/* Intentionally NOT behind `protect` — this is the Guest entry point and
   must never require an account or expose private data. */
router.get('/preview', getPublicPreview)

module.exports = router
