import { useRef, useState } from 'react'
import { calculate } from './api'
import { CalculatorError, OPERATION_SYMBOLS, type BinaryOperation, type Operation, type UnaryOperation } from './types'

const MAX_ENTRY_LENGTH = 15

const ERROR_MESSAGES: Record<string, string> = {
  DIVISION_BY_ZERO: 'Cannot divide by zero',
  SQRT_OF_NEGATIVE: 'Invalid input for square root',
  UNDEFINED_RESULT: 'Result is undefined',
  RESULT_OUT_OF_RANGE: 'Result is too large',
  NETWORK_ERROR: 'Service unreachable',
  TIMEOUT: 'Calculation timed out',
}

export function errorMessage(error: CalculatorError): string {
  return ERROR_MESSAGES[error.code] ?? 'Something went wrong'
}

interface CalculatorState {
  display: string
  storedOperand: number | null
  pendingOp: BinaryOperation | null
  overwrite: boolean
  unaryApplied: boolean
  loading: boolean
  error: CalculatorError | null
}

const initialState: CalculatorState = {
  display: '0',
  storedOperand: null,
  pendingOp: null,
  overwrite: false,
  unaryApplied: false,
  loading: false,
  error: null,
}

function formatNumber(value: number): string {
  return String(Number(value.toPrecision(12)))
}

function historyLine(operation: Operation, operands: number[], result: number): string {
  const value = formatNumber(result)
  if (operation === 'sqrt') return `√${formatNumber(operands[0]!)} = ${value}`
  if (operation === 'percent') return `${formatNumber(operands[0]!)}% = ${value}`
  return `${formatNumber(operands[0]!)} ${OPERATION_SYMBOLS[operation]} ${formatNumber(operands[1]!)} = ${value}`
}

export function useCalculator() {
  const [state, setState] = useState(initialState)
  const [history, setHistory] = useState<string[]>([])
  const requestId = useRef(0)

  async function evaluate(operation: Operation, operands: number[], apply: (result: number) => Partial<CalculatorState>) {
    const id = ++requestId.current
    setState((current) => ({ ...current, loading: true }))
    try {
      const result = await calculate(operation, operands)
      if (id !== requestId.current) return
      setHistory((entries) => [...entries, historyLine(operation, operands, result)].slice(-3))
      setState((current) => ({ ...current, loading: false, ...apply(result) }))
    } catch (caught) {
      if (id !== requestId.current) return
      const error = caught instanceof CalculatorError ? caught : new CalculatorError('UNKNOWN', 'Something went wrong')
      setState((current) => ({
        ...current,
        loading: false,
        storedOperand: null,
        pendingOp: null,
        overwrite: true,
        unaryApplied: false,
        error,
      }))
    }
  }

  function pressDigit(digit: string) {
    if (state.loading) return
    if (state.error) {
      setState({ ...initialState, display: digit })
      return
    }
    if (state.overwrite) {
      setState({ ...state, display: digit, overwrite: false, unaryApplied: false })
      return
    }
    if (state.display === '0') {
      setState({ ...state, display: digit })
      return
    }
    if (state.display.length >= MAX_ENTRY_LENGTH) return
    setState({ ...state, display: state.display + digit })
  }

  function pressDecimal() {
    if (state.loading) return
    if (state.error) {
      setState({ ...initialState, display: '0.' })
      return
    }
    if (state.overwrite) {
      setState({ ...state, display: '0.', overwrite: false, unaryApplied: false })
      return
    }
    if (state.display.includes('.')) return
    setState({ ...state, display: state.display + '.' })
  }

  function pressOperator(operation: BinaryOperation) {
    if (state.loading || state.error) return
    if (state.pendingOp !== null && state.storedOperand !== null && (!state.overwrite || state.unaryApplied)) {
      void evaluate(state.pendingOp, [state.storedOperand, Number(state.display)], (result) => ({
        display: formatNumber(result),
        storedOperand: result,
        pendingOp: operation,
        overwrite: true,
        unaryApplied: false,
      }))
      return
    }
    setState({ ...state, storedOperand: Number(state.display), pendingOp: operation, overwrite: true, unaryApplied: false })
  }

  function pressEquals() {
    if (state.loading || state.error || state.pendingOp === null || state.storedOperand === null) return
    void evaluate(state.pendingOp, [state.storedOperand, Number(state.display)], (result) => ({
      display: formatNumber(result),
      storedOperand: null,
      pendingOp: null,
      overwrite: true,
      unaryApplied: false,
    }))
  }

  function pressUnary(operation: UnaryOperation) {
    if (state.loading || state.error) return
    void evaluate(operation, [Number(state.display)], (result) => ({
      display: formatNumber(result),
      overwrite: true,
      unaryApplied: true,
    }))
  }

  function pressBackspace() {
    if (state.loading || state.error || state.overwrite) return
    const shortened = state.display.slice(0, -1)
    setState({ ...state, display: shortened === '' || shortened === '-' ? '0' : shortened })
  }

  function clearAll() {
    requestId.current++
    setState(initialState)
  }

  return {
    display: state.display,
    pendingOp: state.pendingOp,
    loading: state.loading,
    error: state.error,
    history,
    pressDigit,
    pressDecimal,
    pressOperator,
    pressEquals,
    pressUnary,
    pressBackspace,
    clearAll,
  }
}
