const mongoose = require('mongoose')

async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI)
    console.log(`MongoDB connected: ${conn.connection.host}`)
  } catch (err) {
    console.error('\n❌ Could not connect to MongoDB.')
    console.error(`   URI: ${process.env.MONGO_URI}`)
    console.error('   Make sure MongoDB is installed and running locally,')
    console.error('   or set MONGO_URI in .env to a MongoDB Atlas connection string.\n')
    console.error(`   Reason: ${err.message}\n`)
    process.exit(1)
  }
}

module.exports = connectDB
