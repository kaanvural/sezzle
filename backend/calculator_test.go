package main

import (
	"errors"
	"math"
	"testing"
)

func TestCalculate(t *testing.T) {
	tests := []struct {
		name     string
		op       Operation
		operands []float64
		want     float64
		wantErr  error
	}{
		{name: "add", op: OpAdd, operands: []float64{2, 3}, want: 5},
		{name: "add negatives", op: OpAdd, operands: []float64{-2.5, -0.5}, want: -3},
		{name: "subtract order matters", op: OpSubtract, operands: []float64{10, 4}, want: 6},
		{name: "multiply", op: OpMultiply, operands: []float64{6, 7}, want: 42},
		{name: "multiply by zero", op: OpMultiply, operands: []float64{123.45, 0}, want: 0},
		{name: "divide", op: OpDivide, operands: []float64{10, 4}, want: 2.5},
		{name: "divide negative", op: OpDivide, operands: []float64{-9, 3}, want: -3},
		{name: "power", op: OpPower, operands: []float64{2, 10}, want: 1024},
		{name: "power negative exponent", op: OpPower, operands: []float64{2, -2}, want: 0.25},
		{name: "power zero to zero", op: OpPower, operands: []float64{0, 0}, want: 1},
		{name: "sqrt", op: OpSqrt, operands: []float64{16}, want: 4},
		{name: "sqrt of zero", op: OpSqrt, operands: []float64{0}, want: 0},
		{name: "sqrt inexact", op: OpSqrt, operands: []float64{2}, want: math.Sqrt2},
		{name: "percent", op: OpPercent, operands: []float64{50}, want: 0.5},
		{name: "percent of negative", op: OpPercent, operands: []float64{-200}, want: -2},

		{name: "divide by zero", op: OpDivide, operands: []float64{10, 0}, wantErr: ErrDivisionByZero},
		{name: "zero divided by zero", op: OpDivide, operands: []float64{0, 0}, wantErr: ErrDivisionByZero},
		{name: "sqrt of negative", op: OpSqrt, operands: []float64{-4}, wantErr: ErrSqrtOfNegative},
		{name: "nan operand", op: OpAdd, operands: []float64{math.NaN(), 1}, wantErr: ErrInvalidOperand},
		{name: "infinite operand", op: OpMultiply, operands: []float64{math.Inf(1), 2}, wantErr: ErrInvalidOperand},
		{name: "multiply overflow", op: OpMultiply, operands: []float64{1e308, 10}, wantErr: ErrResultOutOfRange},
		{name: "power overflow", op: OpPower, operands: []float64{10, 10000}, wantErr: ErrResultOutOfRange},
		{name: "power undefined", op: OpPower, operands: []float64{-8, 0.5}, wantErr: ErrUndefinedResult},
		{name: "sqrt with two operands", op: OpSqrt, operands: []float64{4, 2}, wantErr: ErrInvalidOperandCount},
		{name: "percent with two operands", op: OpPercent, operands: []float64{25, 200}, wantErr: ErrInvalidOperandCount},
		{name: "add with one operand", op: OpAdd, operands: []float64{1}, wantErr: ErrInvalidOperandCount},
		{name: "add with no operands", op: OpAdd, operands: nil, wantErr: ErrInvalidOperandCount},
		{name: "unknown operation", op: "modulo", operands: []float64{10, 3}, wantErr: ErrUnknownOperation},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calculate(tt.op, tt.operands)
			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Fatalf("Calculate(%s, %v) error = %v, want %v", tt.op, tt.operands, err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("Calculate(%s, %v) unexpected error: %v", tt.op, tt.operands, err)
			}
			if got != tt.want {
				t.Fatalf("Calculate(%s, %v) = %v, want %v", tt.op, tt.operands, got, tt.want)
			}
		})
	}
}
