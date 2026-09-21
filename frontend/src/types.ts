export type BinaryOperation = 'add' | 'subtract' | 'multiply' | 'divide' | 'power'
export type UnaryOperation = 'sqrt' | 'percent'
export type Operation = BinaryOperation | UnaryOperation

export const OPERATION_SYMBOLS: Record<Operation, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
  power: '^',
  sqrt: '√',
  percent: '%',
}

export class CalculatorError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'CalculatorError'
  }
}
