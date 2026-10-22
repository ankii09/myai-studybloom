import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../../.env') })
dotenv.config()

const defaultAiModel = 'gemini-3.8-flash'
const legacyAiModel = 'gemini-2.5-flash'

function normalizeAiModel(value: string | undefined): string {
  const compact = value?.trim().toLowerCase().replace(/\s+/g, '-') ?? ''
  if (!compact) return defaultAiModel
  if (compact === legacyAiModel) {
    console.warn(`AI_MODEL=${legacyAiModel} is no longer available to new users; switching to ${defaultAiModel}.`)
    return defaultAiModel
  }
  return compact
}

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
  aiApiKey: process.env.AI_API_KEY?.trim() ?? '',
  aiModel: normalizeAiModel(process.env.AI_MODEL),
}
