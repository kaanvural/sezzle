package main

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
)

type calculateRequest struct {
	Operation Operation `json:"operation"`
	Operands  []float64 `json:"operands"`
}

type calculateResponse struct {
	Result float64 `json:"result"`
}

type errorResponse struct {
	Error errorDetail `json:"error"`
}

type errorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func handleCalculate(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 4096)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	var request calculateRequest
	if err := decoder.Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_JSON", "request body must be a JSON object with operation and operands")
		return
	}
	var trailing json.RawMessage
	if err := decoder.Decode(&trailing); !errors.Is(err, io.EOF) {
		writeError(w, http.StatusBadRequest, "INVALID_JSON", "request body must contain a single JSON object")
		return
	}

	result, err := Calculate(request.Operation, request.Operands)
	if err != nil {
		status, code := errorStatus(err)
		writeError(w, status, code, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, calculateResponse{Result: result})
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func errorStatus(err error) (int, string) {
	switch {
	case errors.Is(err, ErrUnknownOperation):
		return http.StatusBadRequest, "UNKNOWN_OPERATION"
	case errors.Is(err, ErrInvalidOperandCount):
		return http.StatusBadRequest, "INVALID_OPERAND_COUNT"
	case errors.Is(err, ErrInvalidOperand):
		return http.StatusBadRequest, "INVALID_OPERAND"
	case errors.Is(err, ErrDivisionByZero):
		return http.StatusUnprocessableEntity, "DIVISION_BY_ZERO"
	case errors.Is(err, ErrSqrtOfNegative):
		return http.StatusUnprocessableEntity, "SQRT_OF_NEGATIVE"
	case errors.Is(err, ErrUndefinedResult):
		return http.StatusUnprocessableEntity, "UNDEFINED_RESULT"
	case errors.Is(err, ErrResultOutOfRange):
		return http.StatusUnprocessableEntity, "RESULT_OUT_OF_RANGE"
	default:
		return http.StatusInternalServerError, "INTERNAL"
	}
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, errorResponse{Error: errorDetail{Code: code, Message: message}})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(body)
}
