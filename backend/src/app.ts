import express from 'express'
import cors from 'cors'
import { getCorsOrigin } from './config/origins.js'
import { chatRouter } from './routes/chat.js'
import { healthRouter } from './routes/health.js'
import { errorHandler } from './middleware/errorHandler.js'
import { logInfo } from './utils/logger.js'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: (origin, callback) => {
        callback(null, getCorsOrigin(origin))
      },
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  )

  app.use(express.json({ limit: '1mb' }))

  app.use((req, _res, next) => {
    logInfo(`${req.method} ${req.path}`)
    next()
  })

  app.use(healthRouter)
  app.use(chatRouter)

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found.' })
  })

  app.use(errorHandler)

  return app
}
