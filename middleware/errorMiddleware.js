function notFound(req, res, next) {
  const err = new Error(`Not found: ${req.originalUrl}`)
  res.status(404)
  next(err)
}

function errorHandler(err, req, res, next) {
  const code = res.statusCode < 400 ? 500 : res.statusCode
  res.status(code).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  })
}

module.exports = { notFound, errorHandler }
