import { calculate } from './api'
import { CalculatorError } from './types'

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

function textResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: async () => {
      throw new SyntaxError('not json')
    },
  } as unknown as Response
}

async function calculateError(...args: Parameters<typeof calculate>): Promise<CalculatorError> {
  try {
    await calculate(...args)
  } catch (error) {
    if (error instanceof CalculatorError) return error
  }
  throw new Error('expected a CalculatorError')
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('calculate', () => {
  it('posts the operation and returns the result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { result: 5 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(calculate('add', [2, 3])).resolves.toBe(5)

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      '/api/v1/calculate',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'add', operands: [2, 3] }),
      }),
    )
  })

  it('maps the error envelope to a CalculatorError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(422, { error: { code: 'DIVISION_BY_ZERO', message: 'division by zero is undefined' } })),
    )

    const error = await calculateError('divide', [10, 0])
    expect(error.code).toBe('DIVISION_BY_ZERO')
    expect(error.message).toBe('division by zero is undefined')
  })

  it('maps an error response without an envelope to BAD_RESPONSE', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(500, {})))

    const error = await calculateError('add', [1, 2])
    expect(error.code).toBe('BAD_RESPONSE')
  })

  it('maps a non-JSON body to BAD_RESPONSE', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(textResponse(502)))

    const error = await calculateError('add', [1, 2])
    expect(error.code).toBe('BAD_RESPONSE')
  })

  it('rejects a null success body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, null)))

    const error = await calculateError('add', [2, 3])
    expect(error.code).toBe('BAD_RESPONSE')
  })

  it('rejects a null error body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(422, null)))

    const error = await calculateError('divide', [10, 0])
    expect(error.code).toBe('BAD_RESPONSE')
  })

  it('rejects a success body without a finite numeric result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { result: 'five' })))

    const error = await calculateError('add', [2, 3])
    expect(error.code).toBe('BAD_RESPONSE')
  })

  it('maps fetch failures to NETWORK_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('failed to fetch')))

    const error = await calculateError('add', [1, 2])
    expect(error.code).toBe('NETWORK_ERROR')
  })

  it('maps timeouts to TIMEOUT', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('timed out', 'TimeoutError')))

    const error = await calculateError('add', [1, 2])
    expect(error.code).toBe('TIMEOUT')
  })
})
