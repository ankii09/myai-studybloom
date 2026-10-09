import type { NextFunction, Request, Response } from 'express'

export function errorHandler(error: Error, _req: Request, res: Response, _next: NextFunction) {
  const statusCode = 'statusCode' in error && typeof (error as { statusCode?: number }).statusCode === 'number'
    ? (error as { statusCode: number }).statusCode
    : 500

  const safeMessage = statusCode >= 500 ? 'Something went wrong. Please try again.' : error.message

  return res.status(statusCode).json({ error: safeMessage })
}
