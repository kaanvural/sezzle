import { useEffect } from 'react'
import { errorMessage, useCalculator } from './useCalculator'
import { OPERATION_SYMBOLS, type BinaryOperation, type UnaryOperation } from './types'

function displayClassName(text: string, hasError: boolean): string {
  const scale = text.length > 15 ? ' scale-sm' : text.length > 11 ? ' scale-md' : ''
  return `display${hasError ? ' error' : ''}${scale}`
}

export function Calculator() {
  const calculator = useCalculator()
  const { display, pendingOp, loading, error, history } = calculator

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const bindings: Record<string, () => void> = {
        '0': () => calculator.pressDigit('0'),
        '1': () => calculator.pressDigit('1'),
        '2': () => calculator.pressDigit('2'),
        '3': () => calculator.pressDigit('3'),
        '4': () => calculator.pressDigit('4'),
        '5': () => calculator.pressDigit('5'),
        '6': () => calculator.pressDigit('6'),
        '7': () => calculator.pressDigit('7'),
        '8': () => calculator.pressDigit('8'),
        '9': () => calculator.pressDigit('9'),
        '.': calculator.pressDecimal,
        '+': () => calculator.pressOperator('add'),
        '-': () => calculator.pressOperator('subtract'),
        '*': () => calculator.pressOperator('multiply'),
        '/': () => calculator.pressOperator('divide'),
        '^': () => calculator.pressOperator('power'),
        '%': () => calculator.pressUnary('percent'),
        r: () => calculator.pressUnary('sqrt'),
        '=': calculator.pressEquals,
        Enter: calculator.pressEquals,
        Backspace: calculator.pressBackspace,
        Escape: calculator.clearAll,
      }
      const action = bindings[event.key]
      if (action) {
        event.preventDefault()
        action()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  function digitKey(digit: string) {
    return (
      <button type="button" key={digit} onClick={() => calculator.pressDigit(digit)} disabled={loading}>
        {digit}
      </button>
    )
  }

  function operatorKey(operation: BinaryOperation, label: string) {
    return (
      <button
        type="button"
        className={pendingOp === operation ? 'operator active' : 'operator'}
        aria-label={operation}
        onClick={() => calculator.pressOperator(operation)}
        disabled={loading}
      >
        {label}
      </button>
    )
  }

  function unaryKey(operation: UnaryOperation, label: string) {
    return (
      <button
        type="button"
        className="operator"
        aria-label={operation}
        onClick={() => calculator.pressUnary(operation)}
        disabled={loading}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="calculator">
      <div className="lcd">
        <span className="lcd-indicator" aria-hidden="true">
          {pendingOp ? OPERATION_SYMBOLS[pendingOp] : ''}
        </span>
        <output
          className={displayClassName(error ? errorMessage(error) : display, error !== null)}
          aria-live="polite"
          aria-busy={loading}
        >
          {error ? errorMessage(error) : display}
        </output>
      </div>
      <div className="keypad">
        <button type="button" className="action" aria-label="all clear" onClick={calculator.clearAll}>
          AC
        </button>
        <button type="button" className="action" aria-label="backspace" onClick={calculator.pressBackspace} disabled={loading}>
          ⌫
        </button>
        {unaryKey('sqrt', '√')}
        {operatorKey('power', '^')}
        {digitKey('7')}
        {digitKey('8')}
        {digitKey('9')}
        {operatorKey('divide', '÷')}
        {digitKey('4')}
        {digitKey('5')}
        {digitKey('6')}
        {operatorKey('multiply', '×')}
        {digitKey('1')}
        {digitKey('2')}
        {digitKey('3')}
        {operatorKey('subtract', '−')}
        {unaryKey('percent', '%')}
        {digitKey('0')}
        <button type="button" aria-label="decimal point" onClick={calculator.pressDecimal} disabled={loading}>
          .
        </button>
        {operatorKey('add', '+')}
        <button type="button" className="equals" aria-label="equals" onClick={calculator.pressEquals} disabled={loading}>
          =
        </button>
      </div>
      <ul className="tape" aria-label="calculation history">
        {history.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ul>
    </div>
  )
}
