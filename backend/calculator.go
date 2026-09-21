package main

import (
	"errors"
	"fmt"
	"math"
)

type Operation string

const (
	OpAdd      Operation = "add"
	OpSubtract Operation = "subtract"
	OpMultiply Operation = "multiply"
	OpDivide   Operation = "divide"
	OpPower    Operation = "power"
	OpSqrt     Operation = "sqrt"
	OpPercent  Operation = "percent"
)

var (
	ErrUnknownOperation    = errors.New("unknown operation")
	ErrInvalidOperandCount = errors.New("invalid operand count")
	ErrInvalidOperand      = errors.New("operands must be finite numbers")
	ErrDivisionByZero      = errors.New("division by zero is undefined")
	ErrSqrtOfNegative      = errors.New("square root of a negative number is undefined")
	ErrUndefinedResult     = errors.New("result is undefined")
	ErrResultOutOfRange    = errors.New("result is out of range")
)

var arity = map[Operation]int{
	OpAdd:      2,
	OpSubtract: 2,
	OpMultiply: 2,
	OpDivide:   2,
	OpPower:    2,
	OpSqrt:     1,
	OpPercent:  1,
}

func Calculate(op Operation, operands []float64) (float64, error) {
	want, known := arity[op]
	if !known {
		return 0, fmt.Errorf("%w: %q", ErrUnknownOperation, op)
	}
	if len(operands) != want {
		return 0, fmt.Errorf("%w: %s takes %d operands, got %d", ErrInvalidOperandCount, op, want, len(operands))
	}
	for _, operand := range operands {
		if math.IsNaN(operand) || math.IsInf(operand, 0) {
			return 0, ErrInvalidOperand
		}
	}

	var result float64
	switch op {
	case OpAdd:
		result = operands[0] + operands[1]
	case OpSubtract:
		result = operands[0] - operands[1]
	case OpMultiply:
		result = operands[0] * operands[1]
	case OpDivide:
		if operands[1] == 0 {
			return 0, ErrDivisionByZero
		}
		result = operands[0] / operands[1]
	case OpPower:
		result = math.Pow(operands[0], operands[1])
	case OpSqrt:
		if operands[0] < 0 {
			return 0, ErrSqrtOfNegative
		}
		result = math.Sqrt(operands[0])
	case OpPercent:
		result = operands[0] / 100
	}

	if math.IsNaN(result) {
		return 0, ErrUndefinedResult
	}
	if math.IsInf(result, 0) {
		return 0, ErrResultOutOfRange
	}
	return result, nil
}
