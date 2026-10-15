import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

type EnvConfig = {
  port: number
  frontendUrl: string
  aiApiKey: string
  aiModel: string
}

const portValue = Number(process.env.PORT ?? '3001')

export const env: EnvConfig = {
  port: Number.isFinite(portValue) && portValue > 0 ? portValue : 3001,
  frontendUrl: process.env.FRONTEND_URL ?? 'https://ankii09.github.io',
  aiApiKey: process.env.AI_API_KEY ?? '',
  aiModel: process.env.AI_MODEL ?? 'gemini-3.8-flash',
}
