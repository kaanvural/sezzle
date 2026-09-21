import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { calculate } from './api'
import App from './App'
import { Calculator } from './Calculator'
import { CalculatorError } from './types'

vi.mock('./api')

const calculateMock = vi.mocked(calculate)

beforeEach(() => {
  calculateMock.mockReset()
})

function display() {
  return screen.getByRole('status')
}

describe('Calculator', () => {
  it('renders inside the app shell', () => {
    render(<App />)
    expect(screen.getByRole('main')).toContainElement(display())
  })

  it('ignores unmapped keys', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    await user.keyboard('5x')
    expect(display()).toHaveTextContent('5')
  })

  it('ignores keys pressed with a modifier', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    await user.keyboard('9{Meta>}r{/Meta}{Control>}5{/Control}')
    expect(calculateMock).not.toHaveBeenCalled()
    expect(display()).toHaveTextContent('9')
  })

  it('renders every key', () => {
    render(<Calculator />)
    const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
    const named = [
      'all clear',
      'backspace',
      'sqrt',
      'power',
      'divide',
      'multiply',
      'subtract',
      'add',
      'percent',
      'decimal point',
      'equals',
    ]
    for (const name of [...digits, ...named]) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
    expect(screen.getAllByRole('button')).toHaveLength(21)
  })

  it('computes 2 + 3 = 5 through clicks', async () => {
    calculateMock.mockResolvedValue(5)
    const user = userEvent.setup()
    render(<Calculator />)
    await user.click(screen.getByRole('button', { name: '2' }))
    await user.click(screen.getByRole('button', { name: 'add' }))
    await user.click(screen.getByRole('button', { name: '3' }))
    await user.click(screen.getByRole('button', { name: 'equals' }))
    expect(calculateMock).toHaveBeenCalledExactlyOnceWith('add', [2, 3])
    expect(display()).toHaveTextContent('5')
  })

  it('shows a friendly divide-by-zero message', async () => {
    calculateMock.mockRejectedValue(new CalculatorError('DIVISION_BY_ZERO', 'division by zero is undefined'))
    const user = userEvent.setup()
    render(<Calculator />)
    await user.click(screen.getByRole('button', { name: '1' }))
    await user.click(screen.getByRole('button', { name: '0' }))
    await user.click(screen.getByRole('button', { name: 'divide' }))
    await user.click(screen.getByRole('button', { name: '0' }))
    await user.click(screen.getByRole('button', { name: 'equals' }))
    expect(display()).toHaveTextContent('Cannot divide by zero')
  })

  it('supports keyboard input', async () => {
    calculateMock.mockResolvedValue(5)
    const user = userEvent.setup()
    render(<Calculator />)
    await user.keyboard('2+3{Enter}')
    expect(calculateMock).toHaveBeenCalledExactlyOnceWith('add', [2, 3])
    expect(display()).toHaveTextContent('5')
    await user.keyboard('{Escape}')
    expect(display()).toHaveTextContent('0')
  })

  it('logs the calculation on the tape', async () => {
    calculateMock.mockResolvedValue(5)
    const user = userEvent.setup()
    render(<Calculator />)
    await user.click(screen.getByRole('button', { name: '2' }))
    await user.click(screen.getByRole('button', { name: 'add' }))
    await user.click(screen.getByRole('button', { name: '3' }))
    await user.click(screen.getByRole('button', { name: 'equals' }))
    expect(screen.getByText('2 + 3 = 5')).toBeInTheDocument()
  })

  it('shrinks long values instead of wrapping', async () => {
    calculateMock.mockResolvedValue(2.8284271247461903)
    const user = userEvent.setup()
    render(<Calculator />)
    await user.click(screen.getByRole('button', { name: '8' }))
    await user.click(screen.getByRole('button', { name: 'sqrt' }))
    expect(display()).toHaveTextContent('2.82842712475')
    expect(display()).toHaveClass('scale-md')
  })

  it('marks the pending operator as active', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    await user.click(screen.getByRole('button', { name: '2' }))
    await user.click(screen.getByRole('button', { name: 'add' }))
    expect(screen.getByRole('button', { name: 'add' })).toHaveClass('active')
  })

  it('enters every digit through its button', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    for (const digit of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']) {
      await user.click(screen.getByRole('button', { name: 'all clear' }))
      await user.click(screen.getByRole('button', { name: digit }))
      expect(display()).toHaveTextContent(digit)
    }
  })

  it.each([
    ['add', [3, 2]],
    ['subtract', [3, 2]],
    ['multiply', [3, 2]],
    ['divide', [3, 2]],
    ['power', [3, 2]],
  ] as const)('sends %s through its button', async (operation, operands) => {
    calculateMock.mockResolvedValue(1)
    const user = userEvent.setup()
    render(<Calculator />)
    await user.click(screen.getByRole('button', { name: '3' }))
    await user.click(screen.getByRole('button', { name: operation }))
    await user.click(screen.getByRole('button', { name: '2' }))
    await user.click(screen.getByRole('button', { name: 'equals' }))
    expect(calculateMock).toHaveBeenCalledExactlyOnceWith(operation, [...operands])
  })

  it.each([
    ['sqrt', [9]],
    ['percent', [9]],
  ] as const)('sends %s immediately through its button', async (operation, operands) => {
    calculateMock.mockResolvedValue(1)
    const user = userEvent.setup()
    render(<Calculator />)
    await user.click(screen.getByRole('button', { name: '9' }))
    await user.click(screen.getByRole('button', { name: operation }))
    expect(calculateMock).toHaveBeenCalledExactlyOnceWith(operation, [...operands])
  })

  it('edits the entry with decimal, backspace, and all clear buttons', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    await user.click(screen.getByRole('button', { name: '1' }))
    await user.click(screen.getByRole('button', { name: 'decimal point' }))
    await user.click(screen.getByRole('button', { name: '5' }))
    expect(display()).toHaveTextContent('1.5')
    await user.click(screen.getByRole('button', { name: 'backspace' }))
    expect(display()).toHaveTextContent('1.')
    await user.click(screen.getByRole('button', { name: 'all clear' }))
    expect(display()).toHaveTextContent('0')
  })

  it('enters every digit through the keyboard', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    await user.keyboard('1234567890')
    expect(display()).toHaveTextContent('1234567890')
  })

  it.each([
    ['+', 'add'],
    ['-', 'subtract'],
    ['*', 'multiply'],
    ['/', 'divide'],
    ['^', 'power'],
  ] as const)('maps the %s key to %s', async (key, operation) => {
    calculateMock.mockResolvedValue(1)
    const user = userEvent.setup()
    render(<Calculator />)
    await user.keyboard(`6${key}2=`)
    expect(calculateMock).toHaveBeenCalledExactlyOnceWith(operation, [6, 2])
  })

  it.each([
    ['r', 'sqrt'],
    ['%', 'percent'],
  ] as const)('maps the %s key to %s', async (key, operation) => {
    calculateMock.mockResolvedValue(1)
    const user = userEvent.setup()
    render(<Calculator />)
    await user.keyboard(`9${key}`)
    expect(calculateMock).toHaveBeenCalledExactlyOnceWith(operation, [9])
  })

  it('maps decimal point and backspace keys', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    await user.keyboard('3.14{Backspace}')
    expect(display()).toHaveTextContent('3.1')
  })

  it('disables keys while a request is in flight', async () => {
    calculateMock.mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    render(<Calculator />)
    await user.click(screen.getByRole('button', { name: '2' }))
    await user.click(screen.getByRole('button', { name: 'add' }))
    await user.click(screen.getByRole('button', { name: '3' }))
    await user.click(screen.getByRole('button', { name: 'equals' }))
    expect(display()).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: '7' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'all clear' })).toBeEnabled()
  })
})
