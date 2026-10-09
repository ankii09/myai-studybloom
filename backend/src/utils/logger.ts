export function logRequest(method: string, path: string, statusCode: number, durationMs: number) {
  const methodColor = method === 'GET' ? '\x1b[36m' : method === 'POST' ? '\x1b[35m' : '\x1b[33m'
  console.log(`${methodColor}${method}\x1b[0m ${path} ${statusCode} ${durationMs}ms`)
}

export function logInfo(message: string) {
  console.info(`\x1b[32m[info]\x1b[0m ${message}`)
}

export function logError(message: string) {
  console.error(`\x1b[31m[error]\x1b[0m ${message}`)
}
