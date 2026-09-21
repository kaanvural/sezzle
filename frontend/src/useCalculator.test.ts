import { act, renderHook } from '@testing-library/react'
import { calculate } from './api'
import { CalculatorError } from './types'
import { errorMessage, useCalculator } from './useCalculator'

vi.mock('./api')

const calculateMock = vi.mocked(calculate)

function setup() {
  return renderHook(() => useCalculator()).result
}

beforeEach(() => {
  calculateMock.mockReset()
})

describe('digit and decimal entry', () => {
  it('appends digits', () => {
    const calc = setup()
    act(() => calc.current.pressDigit('1'))
    act(() => calc.current.pressDigit('2'))
    expect(calc.current.display).toBe('12')
  })

  it('replaces a leading zero', () => {
    const calc = setup()
    act(() => calc.current.pressDigit('0'))
    act(() => calc.current.pressDigit('5'))
    expect(calc.current.display).toBe('5')
  })

  it('keeps a single zero', () => {
    const calc = setup()
    act(() => calc.current.pressDigit('0'))
    act(() => calc.current.pressDigit('0'))
    expect(calc.current.display).toBe('0')
  })

  it('caps entry length', () => {
    const calc = setup()
    for (let i = 0; i < 20; i++) {
      act(() => calc.current.pressDigit('9'))
    }
    expect(calc.current.display).toHaveLength(15)
  })

  it('starts a decimal entry from zero', () => {
    const calc = setup()
    act(() => calc.current.pressDecimal())
    expect(calc.current.display).toBe('0.')
  })

  it('starts a decimal entry after a result', async () => {
    calculateMock.mockResolvedValue(5)
    const calc = setup()
    act(() => calc.current.pressDigit('2'))
    act(() => calc.current.pressOperator('add'))
    act(() => calc.current.pressDigit('3'))
    await act(async () => calc.current.pressEquals())
    act(() => calc.current.pressDecimal())
    expect(calc.current.display).toBe('0.')
  })

  it('starts a decimal entry after an error', async () => {
    calculateMock.mockRejectedValue(new CalculatorError('DIVISION_BY_ZERO', 'division by zero is undefined'))
    const calc = setup()
    act(() => calc.current.pressDigit('1'))
    act(() => calc.current.pressOperator('divide'))
    act(() => calc.current.pressDigit('0'))
    await act(async () => calc.current.pressEquals())
    act(() => calc.current.pressDecimal())
    expect(calc.current.error).toBeNull()
    expect(calc.current.display).toBe('0.')
  })

  it('allows only one decimal point', () => {
    const calc = setup()
    act(() => calc.current.pressDigit('1'))
    act(() => calc.current.pressDecimal())
    act(() => calc.current.pressDigit('5'))
    act(() => calc.current.pressDecimal())
    expect(calc.current.display).toBe('1.5')
  })
})

describe('binary operations', () => {
  it('computes 2 + 3 through the service', async () => {
    calculateMock.mockResolvedValue(5)
    const calc = setup()
    act(() => calc.current.pressDigit('2'))
    act(() => calc.current.pressOperator('add'))
    act(() => calc.current.pressDigit('3'))
    await act(async () => calc.current.pressEquals())
    expect(calculateMock).toHaveBeenCalledExactlyOnceWith('add', [2, 3])
    expect(calc.current.display).toBe('5')
  })

  it('computes a decimal division result', async () => {
    calculateMock.mockResolvedValue(2.5)
    const calc = setup()
    act(() => calc.current.pressDigit('1'))
    act(() => calc.current.pressDigit('0'))
    act(() => calc.current.pressOperator('divide'))
    act(() => calc.current.pressDigit('4'))
    await act(async () => calc.current.pressEquals())
    expect(calculateMock).toHaveBeenCalledExactlyOnceWith('divide', [10, 4])
    expect(calc.current.display).toBe('2.5')
  })

  it('evaluates the pending operation when chaining operators', async () => {
    calculateMock.mockResolvedValueOnce(5).mockResolvedValueOnce(20)
    const calc = setup()
    act(() => calc.current.pressDigit('2'))
    act(() => calc.current.pressOperator('add'))
    act(() => calc.current.pressDigit('3'))
    await act(async () => calc.current.pressOperator('multiply'))
    expect(calculateMock).toHaveBeenNthCalledWith(1, 'add', [2, 3])
    expect(calc.current.display).toBe('5')
    act(() => calc.current.pressDigit('4'))
    await act(async () => calc.current.pressEquals())
    expect(calculateMock).toHaveBeenNthCalledWith(2, 'multiply', [5, 4])
    expect(calc.current.display).toBe('20')
  })

  it('replaces the pending operator without calling the service', async () => {
    calculateMock.mockResolvedValue(8)
    const calc = setup()
    act(() => calc.current.pressDigit('2'))
    act(() => calc.current.pressOperator('add'))
    act(() => calc.current.pressOperator('multiply'))
    expect(calculateMock).not.toHaveBeenCalled()
    act(() => calc.current.pressDigit('4'))
    await act(async () => calc.current.pressEquals())
    expect(calculateMock).toHaveBeenCalledExactlyOnceWith('multiply', [2, 4])
  })

  it('ignores equals without a pending operation', async () => {
    const calc = setup()
    act(() => calc.current.pressDigit('7'))
    await act(async () => calc.current.pressEquals())
    expect(calculateMock).not.toHaveBeenCalled()
    expect(calc.current.display).toBe('7')
  })

  it('formats floating point noise from the service', async () => {
    calculateMock.mockResolvedValue(0.30000000000000004)
    const calc = setup()
    act(() => calc.current.pressDigit('1'))
    act(() => calc.current.pressOperator('add'))
    act(() => calc.current.pressDigit('2'))
    await act(async () => calc.current.pressEquals())
    expect(calc.current.display).toBe('0.3')
  })

  it('starts a fresh entry after a result', async () => {
    calculateMock.mockResolvedValue(5)
    const calc = setup()
    act(() => calc.current.pressDigit('2'))
    act(() => calc.current.pressOperator('add'))
    act(() => calc.current.pressDigit('3'))
    await act(async () => calc.current.pressEquals())
    act(() => calc.current.pressDigit('7'))
    expect(calc.current.display).toBe('7')
  })
})

describe('unary operations', () => {
  it('computes a square root immediately', async () => {
    calculateMock.mockResolvedValue(4)
    const calc = setup()
    act(() => calc.current.pressDigit('1'))
    act(() => calc.current.pressDigit('6'))
    await act(async () => calc.current.pressUnary('sqrt'))
    expect(calculateMock).toHaveBeenCalledExactlyOnceWith('sqrt', [16])
    expect(calc.current.display).toBe('4')
  })

  it('computes a percentage immediately', async () => {
    calculateMock.mockResolvedValue(0.5)
    const calc = setup()
    act(() => calc.current.pressDigit('5'))
    act(() => calc.current.pressDigit('0'))
    await act(async () => calc.current.pressUnary('percent'))
    expect(calculateMock).toHaveBeenCalledExactlyOnceWith('percent', [50])
    expect(calc.current.display).toBe('0.5')
  })

  it('evaluates the pending operation when chaining an operator after a unary result', async () => {
    calculateMock.mockResolvedValueOnce(4).mockResolvedValueOnce(13).mockResolvedValueOnce(26)
    const calc = setup()
    act(() => calc.current.pressDigit('9'))
    act(() => calc.current.pressOperator('add'))
    act(() => calc.current.pressDigit('1'))
    act(() => calc.current.pressDigit('6'))
    await act(async () => calc.current.pressUnary('sqrt'))
    await act(async () => calc.current.pressOperator('multiply'))
    expect(calculateMock).toHaveBeenNthCalledWith(2, 'add', [9, 4])
    expect(calc.current.display).toBe('13')
    act(() => calc.current.pressDigit('2'))
    await act(async () => calc.current.pressEquals())
    expect(calculateMock).toHaveBeenNthCalledWith(3, 'multiply', [13, 2])
    expect(calc.current.display).toBe('26')
  })

  it('preserves the pending operation across a unary call', async () => {
    calculateMock.mockResolvedValueOnce(4).mockResolvedValueOnce(13)
    const calc = setup()
    act(() => calc.current.pressDigit('9'))
    act(() => calc.current.pressOperator('add'))
    act(() => calc.current.pressDigit('1'))
    act(() => calc.current.pressDigit('6'))
    await act(async () => calc.current.pressUnary('sqrt'))
    expect(calc.current.display).toBe('4')
    await act(async () => calc.current.pressEquals())
    expect(calculateMock).toHaveBeenNthCalledWith(2, 'add', [9, 4])
    expect(calc.current.display).toBe('13')
  })
})

describe('clearing', () => {
  it('backspace removes the last character', () => {
    const calc = setup()
    act(() => calc.current.pressDigit('1'))
    act(() => calc.current.pressDigit('2'))
    act(() => calc.current.pressDigit('3'))
    act(() => calc.current.pressBackspace())
    expect(calc.current.display).toBe('12')
  })

  it('backspace on the last digit leaves zero', () => {
    const calc = setup()
    act(() => calc.current.pressDigit('7'))
    act(() => calc.current.pressBackspace())
    expect(calc.current.display).toBe('0')
  })

  it('backspace does not edit a result', async () => {
    calculateMock.mockResolvedValue(5)
    const calc = setup()
    act(() => calc.current.pressDigit('2'))
    act(() => calc.current.pressOperator('add'))
    act(() => calc.current.pressDigit('3'))
    await act(async () => calc.current.pressEquals())
    act(() => calc.current.pressBackspace())
    expect(calc.current.display).toBe('5')
  })

  it('clear resets everything', async () => {
    calculateMock.mockResolvedValue(5)
    const calc = setup()
    act(() => calc.current.pressDigit('2'))
    act(() => calc.current.pressOperator('add'))
    act(() => calc.current.pressDigit('3'))
    act(() => calc.current.clearAll())
    expect(calc.current.display).toBe('0')
    expect(calc.current.pendingOp).toBeNull()
    await act(async () => calc.current.pressEquals())
    expect(calculateMock).not.toHaveBeenCalled()
  })
})

describe('history', () => {
  it('records completed calculations', async () => {
    calculateMock.mockResolvedValue(5)
    const calc = setup()
    act(() => calc.current.pressDigit('2'))
    act(() => calc.current.pressOperator('add'))
    act(() => calc.current.pressDigit('3'))
    await act(async () => calc.current.pressEquals())
    expect(calc.current.history).toEqual(['2 + 3 = 5'])
  })

  it('records unary calculations with their notation', async () => {
    calculateMock.mockResolvedValueOnce(4).mockResolvedValueOnce(0.04)
    const calc = setup()
    act(() => calc.current.pressDigit('1'))
    act(() => calc.current.pressDigit('6'))
    await act(async () => calc.current.pressUnary('sqrt'))
    await act(async () => calc.current.pressUnary('percent'))
    expect(calc.current.history).toEqual(['√16 = 4', '4% = 0.04'])
  })

  it('keeps only the last three entries', async () => {
    for (let i = 1; i <= 5; i++) {
      calculateMock.mockResolvedValueOnce(i)
    }
    const calc = setup()
    for (let i = 0; i < 5; i++) {
      act(() => calc.current.pressDigit('1'))
      act(() => calc.current.pressOperator('add'))
      act(() => calc.current.pressDigit('2'))
      await act(async () => calc.current.pressEquals())
    }
    expect(calc.current.history).toHaveLength(3)
    expect(calc.current.history[0]).toBe('1 + 2 = 3')
    expect(calc.current.history[2]).toBe('1 + 2 = 5')
  })

  it('survives all clear', async () => {
    calculateMock.mockResolvedValue(5)
    const calc = setup()
    act(() => calc.current.pressDigit('2'))
    act(() => calc.current.pressOperator('add'))
    act(() => calc.current.pressDigit('3'))
    await act(async () => calc.current.pressEquals())
    act(() => calc.current.clearAll())
    expect(calc.current.display).toBe('0')
    expect(calc.current.history).toEqual(['2 + 3 = 5'])
  })

  it('does not record failed calculations', async () => {
    calculateMock.mockRejectedValue(new CalculatorError('DIVISION_BY_ZERO', 'division by zero is undefined'))
    const calc = setup()
    act(() => calc.current.pressDigit('1'))
    act(() => calc.current.pressOperator('divide'))
    act(() => calc.current.pressDigit('0'))
    await act(async () => calc.current.pressEquals())
    expect(calc.current.history).toEqual([])
  })
})

describe('errors and loading', () => {
  it('surfaces a calculation error with a friendly message', async () => {
    calculateMock.mockRejectedValue(new CalculatorError('DIVISION_BY_ZERO', 'division by zero is undefined'))
    const calc = setup()
    act(() => calc.current.pressDigit('1'))
    act(() => calc.current.pressDigit('0'))
    act(() => calc.current.pressOperator('divide'))
    act(() => calc.current.pressDigit('0'))
    await act(async () => calc.current.pressEquals())
    expect(calc.current.error).not.toBeNull()
    expect(errorMessage(calc.current.error!)).toBe('Cannot divide by zero')
  })

  it('recovers from an error on the next digit', async () => {
    calculateMock.mockRejectedValue(new CalculatorError('NETWORK_ERROR', 'unreachable'))
    const calc = setup()
    act(() => calc.current.pressDigit('2'))
    act(() => calc.current.pressOperator('add'))
    act(() => calc.current.pressDigit('3'))
    await act(async () => calc.current.pressEquals())
    expect(calc.current.error).not.toBeNull()
    act(() => calc.current.pressDigit('7'))
    expect(calc.current.error).toBeNull()
    expect(calc.current.display).toBe('7')
  })

  it('ignores operators while an error is shown', async () => {
    calculateMock.mockRejectedValue(new CalculatorError('DIVISION_BY_ZERO', 'division by zero is undefined'))
    const calc = setup()
    act(() => calc.current.pressDigit('1'))
    act(() => calc.current.pressOperator('divide'))
    act(() => calc.current.pressDigit('0'))
    await act(async () => calc.current.pressEquals())
    calculateMock.mockClear()
    act(() => calc.current.pressOperator('add'))
    await act(async () => calc.current.pressEquals())
    expect(calculateMock).not.toHaveBeenCalled()
  })

  it('falls back to a generic message for unknown codes', () => {
    expect(errorMessage(new CalculatorError('SOMETHING_NEW', 'detail'))).toBe('Something went wrong')
  })

  it('locks the keypad while a request is in flight', async () => {
    let resolveCalculation: (value: number) => void = () => {}
    calculateMock.mockImplementation(
      () =>
        new Promise<number>((resolve) => {
          resolveCalculation = resolve
        }),
    )
    const calc = setup()
    act(() => calc.current.pressDigit('2'))
    act(() => calc.current.pressOperator('add'))
    act(() => calc.current.pressDigit('3'))
    act(() => calc.current.pressEquals())
    expect(calc.current.loading).toBe(true)
    act(() => calc.current.pressDigit('9'))
    act(() => calc.current.pressEquals())
    expect(calculateMock).toHaveBeenCalledTimes(1)
    await act(async () => resolveCalculation(5))
    expect(calc.current.loading).toBe(false)
    expect(calc.current.display).toBe('5')
  })

  it('drops an in-flight result after clear', async () => {
    let resolveCalculation: (value: number) => void = () => {}
    calculateMock.mockImplementation(
      () =>
        new Promise<number>((resolve) => {
          resolveCalculation = resolve
        }),
    )
    const calc = setup()
    act(() => calc.current.pressDigit('2'))
    act(() => calc.current.pressOperator('add'))
    act(() => calc.current.pressDigit('3'))
    act(() => calc.current.pressEquals())
    act(() => calc.current.clearAll())
    await act(async () => resolveCalculation(5))
    expect(calc.current.display).toBe('0')
    expect(calc.current.loading).toBe(false)
  })
})
