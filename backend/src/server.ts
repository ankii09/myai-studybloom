import { createApp } from './app.js'
import { env } from './config/env.js'
import { logInfo } from './utils/logger.js'

const app = createApp()

app.listen(env.port, () => {
  logInfo(`AI backend listening on http://localhost:${env.port}`)
})
