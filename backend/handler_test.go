package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func doRequest(t *testing.T, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	request := httptest.NewRequest(method, path, strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	newMux("").ServeHTTP(recorder, request)
	return recorder
}

func decodeErrorCode(t *testing.T, recorder *httptest.ResponseRecorder) string {
	t.Helper()
	var response errorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("response is not an error envelope: %s", recorder.Body.String())
	}
	return response.Error.Code
}

func TestCalculateEndpointSuccess(t *testing.T) {
	tests := []struct {
		name string
		body string
		want float64
	}{
		{name: "add", body: `{"operation":"add","operands":[2,3]}`, want: 5},
		{name: "subtract", body: `{"operation":"subtract","operands":[10,4]}`, want: 6},
		{name: "multiply", body: `{"operation":"multiply","operands":[6,7]}`, want: 42},
		{name: "divide", body: `{"operation":"divide","operands":[10,4]}`, want: 2.5},
		{name: "power", body: `{"operation":"power","operands":[2,10]}`, want: 1024},
		{name: "sqrt", body: `{"operation":"sqrt","operands":[16]}`, want: 4},
		{name: "percent", body: `{"operation":"percent","operands":[50]}`, want: 0.5},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			recorder := doRequest(t, http.MethodPost, "/api/v1/calculate", tt.body)
			if recorder.Code != http.StatusOK {
				t.Fatalf("status = %d, body = %s", recorder.Code, recorder.Body.String())
			}
			if contentType := recorder.Header().Get("Content-Type"); contentType != "application/json" {
				t.Fatalf("Content-Type = %q", contentType)
			}
			var response calculateResponse
			if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
				t.Fatalf("invalid response body: %s", recorder.Body.String())
			}
			if response.Result != tt.want {
				t.Fatalf("result = %v, want %v", response.Result, tt.want)
			}
		})
	}
}

func TestCalculateEndpointErrors(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantStatus int
		wantCode   string
	}{
		{name: "malformed json", body: `{"operation":`, wantStatus: 400, wantCode: "INVALID_JSON"},
		{name: "unknown field", body: `{"operation":"add","operands":[1,2],"extra":1}`, wantStatus: 400, wantCode: "INVALID_JSON"},
		{name: "trailing data", body: `{"operation":"add","operands":[1,2]}{}`, wantStatus: 400, wantCode: "INVALID_JSON"},
		{name: "string operand", body: `{"operation":"add","operands":["1",2]}`, wantStatus: 400, wantCode: "INVALID_JSON"},
		{name: "unknown operation", body: `{"operation":"modulo","operands":[10,3]}`, wantStatus: 400, wantCode: "UNKNOWN_OPERATION"},
		{name: "missing operand", body: `{"operation":"add","operands":[1]}`, wantStatus: 400, wantCode: "INVALID_OPERAND_COUNT"},
		{name: "extra operand", body: `{"operation":"sqrt","operands":[4,2]}`, wantStatus: 400, wantCode: "INVALID_OPERAND_COUNT"},
		{name: "division by zero", body: `{"operation":"divide","operands":[10,0]}`, wantStatus: 422, wantCode: "DIVISION_BY_ZERO"},
		{name: "sqrt of negative", body: `{"operation":"sqrt","operands":[-4]}`, wantStatus: 422, wantCode: "SQRT_OF_NEGATIVE"},
		{name: "undefined power", body: `{"operation":"power","operands":[-8,0.5]}`, wantStatus: 422, wantCode: "UNDEFINED_RESULT"},
		{name: "overflow", body: `{"operation":"multiply","operands":[1e308,10]}`, wantStatus: 422, wantCode: "RESULT_OUT_OF_RANGE"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			recorder := doRequest(t, http.MethodPost, "/api/v1/calculate", tt.body)
			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d, body = %s", recorder.Code, tt.wantStatus, recorder.Body.String())
			}
			if code := decodeErrorCode(t, recorder); code != tt.wantCode {
				t.Fatalf("code = %q, want %q", code, tt.wantCode)
			}
		})
	}
}

func TestCalculateEndpointRejectsWrongMethod(t *testing.T) {
	recorder := doRequest(t, http.MethodGet, "/api/v1/calculate", "")
	if recorder.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status = %d, want 405", recorder.Code)
	}
}

func TestErrorStatusMapping(t *testing.T) {
	tests := []struct {
		err        error
		wantStatus int
		wantCode   string
	}{
		{err: ErrUnknownOperation, wantStatus: 400, wantCode: "UNKNOWN_OPERATION"},
		{err: ErrInvalidOperandCount, wantStatus: 400, wantCode: "INVALID_OPERAND_COUNT"},
		{err: ErrInvalidOperand, wantStatus: 400, wantCode: "INVALID_OPERAND"},
		{err: ErrDivisionByZero, wantStatus: 422, wantCode: "DIVISION_BY_ZERO"},
		{err: ErrSqrtOfNegative, wantStatus: 422, wantCode: "SQRT_OF_NEGATIVE"},
		{err: ErrUndefinedResult, wantStatus: 422, wantCode: "UNDEFINED_RESULT"},
		{err: ErrResultOutOfRange, wantStatus: 422, wantCode: "RESULT_OUT_OF_RANGE"},
		{err: errors.New("unexpected"), wantStatus: 500, wantCode: "INTERNAL"},
	}

	for _, tt := range tests {
		t.Run(tt.wantCode, func(t *testing.T) {
			status, code := errorStatus(tt.err)
			if status != tt.wantStatus || code != tt.wantCode {
				t.Fatalf("errorStatus(%v) = %d %q, want %d %q", tt.err, status, code, tt.wantStatus, tt.wantCode)
			}
		})
	}
}

func TestHealthEndpoint(t *testing.T) {
	recorder := doRequest(t, http.MethodGet, "/healthz", "")
	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", recorder.Code)
	}
	if body := strings.TrimSpace(recorder.Body.String()); body != `{"status":"ok"}` {
		t.Fatalf("body = %s", body)
	}
}

func TestStaticFileServing(t *testing.T) {
	staticDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(staticDir, "index.html"), []byte("<html>calculator</html>"), 0o644); err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodGet, "/", nil)
	recorder := httptest.NewRecorder()
	newMux(staticDir).ServeHTTP(recorder, request)
	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), "calculator") {
		t.Fatalf("body = %s", recorder.Body.String())
	}
}
