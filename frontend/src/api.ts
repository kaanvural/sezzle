import { CalculatorError, type Operation } from './types'

export async function calculate(operation: Operation, operands: number[]): Promise<number> {
  let response: Response
  try {
    response = await fetch('/api/v1/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation, operands }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new CalculatorError('TIMEOUT', 'The calculation timed out')
    }
    throw new CalculatorError('NETWORK_ERROR', 'The calculator service is unreachable')
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new CalculatorError('BAD_RESPONSE', 'The service returned an unreadable response')
  }

  const payload = (typeof body === 'object' && body !== null ? body : {}) as {
    result?: unknown
    error?: { code?: string; message?: string }
  }

  if (!response.ok) {
    throw new CalculatorError(
      payload.error?.code ?? 'BAD_RESPONSE',
      payload.error?.message ?? 'The calculation failed',
    )
  }

  if (typeof payload.result !== 'number' || !Number.isFinite(payload.result)) {
    throw new CalculatorError('BAD_RESPONSE', 'The service returned an invalid result')
  }
  return payload.result
}
