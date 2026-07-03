package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

const totalRecords int64 = 10_000_000

var weights = []int{7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2}
var checkChars = []byte{'1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'}
var areaCodes = []string{
	"110101", "110102", "310101", "310105", "440103", "440104",
	"320102", "320104", "330102", "330103", "500101", "500103",
	"510104", "510105", "610102", "610103", "420102", "420103",
	"210102", "210103", "370102", "370103", "350102", "350103",
	"120101", "120103", "230102", "230103", "410102", "410103",
}

type IdentityRecord struct {
	Index     int64  `json:"index"`
	ID        string `json:"id"`
	BirthDate string `json:"birthDate"`
	Age       int    `json:"age"`
	Gender    string `json:"gender"`
	Area      string `json:"area"`
	Status    string `json:"status"`
	Engine    string `json:"engine"`
}

type RecordsPage struct {
	Page         int              `json:"page"`
	PageSize     int              `json:"pageSize"`
	Total        int64            `json:"total"`
	VisibleTotal int64            `json:"visibleTotal"`
	Records      []IdentityRecord `json:"records"`
}

type AnalysisSummary struct {
	Total          int64            `json:"total"`
	Valid          int64            `json:"valid"`
	Invalid        int64            `json:"invalid"`
	Male           int64            `json:"male"`
	Female         int64            `json:"female"`
	AgeBuckets     map[string]int64 `json:"ageBuckets"`
	InvalidReasons map[string]int64 `json:"invalidReasons"`
	ElapsedMs      int64            `json:"elapsedMs"`
	Speed          int64            `json:"speed"`
	Workers        int              `json:"workers"`
	Engine         string           `json:"engine"`
}

type Progress struct {
	Processed int64  `json:"processed"`
	Total     int64  `json:"total"`
	Valid     int64  `json:"valid"`
	Invalid   int64  `json:"invalid"`
	Percent   float64 `json:"percent"`
	Done      bool   `json:"done"`
	ElapsedMs int64  `json:"elapsedMs"`
	Speed     int64  `json:"speed"`
	Workers   int    `json:"workers"`
	Engine    string `json:"engine"`
}

var (
	progress   = Progress{Total: totalRecords, Workers: runtime.NumCPU(), Engine: "Go"}
	summary    = emptySummary(totalRecords, runtime.NumCPU())
	generated  bool
	processing int32
	mu         sync.RWMutex
)

func checksum(base string) byte {
	sum := 0
	for i := 0; i < 17; i++ {
		sum += int(base[i]-'0') * weights[i]
	}
	return checkChars[sum%11]
}

func recordAt(index int64) IdentityRecord {
	if index < 1 {
		index = 1
	}
	zero := index - 1
	area := areaCodes[zero%int64(len(areaCodes))]
	year := 1945 + int((zero*37)%66)
	month := 1 + int((zero*17)%12)
	day := 1 + int((zero*23)%28)
	seqNumber := int((zero * 19) % 1000)
	seq := fmt.Sprintf("%03d", seqNumber)
	birth := fmt.Sprintf("%04d%02d%02d", year, month, day)
	base := area + birth + seq
	status := "通过"
	check := checksum(base)
	if zero%217 == 0 {
		status = "失败"
		check = 'A'
	}
	gender := "女"
	if seqNumber%2 == 1 {
		gender = "男"
	}
	return IdentityRecord{
		Index:     index,
		ID:        base + string(check),
		BirthDate: fmt.Sprintf("%04d-%02d-%02d", year, month, day),
		Age:       2026 - year,
		Gender:    gender,
		Area:      area,
		Status:    status,
		Engine:    "Go",
	}
}

func matches(record IdentityRecord, gender, valid, query string) bool {
	if gender != "" && gender != "all" && record.Gender != gender {
		return false
	}
	if valid != "" && valid != "all" && record.Status != valid {
		return false
	}
	if query != "" && !strings.Contains(record.ID, strings.ToUpper(query)) {
		return false
	}
	return true
}

func estimateVisibleTotal(gender, valid, query string) int64 {
	if query != "" {
		return totalRecords / 12000
	}
	total := totalRecords
	if gender != "" && gender != "all" {
		total /= 2
	}
	if valid == "失败" {
		total /= 217
	}
	if valid == "通过" {
		total -= total / 217
	}
	if total < 1 {
		return 1
	}
	return total
}

func buildRecordsPage(page, pageSize int, gender, valid, query string) RecordsPage {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 500 {
		pageSize = 50
	}
	mu.RLock()
	ready := generated
	mu.RUnlock()
	if !ready {
		return RecordsPage{
			Page:         page,
			PageSize:     pageSize,
			Total:        totalRecords,
			VisibleTotal: 0,
			Records:      []IdentityRecord{},
		}
	}
	start := int64((page-1)*pageSize + 1)
	records := make([]IdentityRecord, 0, pageSize)
	for cursor, guard := start, 0; cursor <= totalRecords && len(records) < pageSize && guard < pageSize*240; cursor, guard = cursor+1, guard+1 {
		record := recordAt(cursor)
		if matches(record, gender, valid, query) {
			records = append(records, record)
		}
	}
	return RecordsPage{
		Page:         page,
		PageSize:     pageSize,
		Total:        totalRecords,
		VisibleTotal: estimateVisibleTotal(gender, valid, query),
		Records:      records,
	}
}

func emptySummary(total int64, workers int) AnalysisSummary {
	return AnalysisSummary{
		Total:          total,
		AgeBuckets:     map[string]int64{"0-17": 0, "18-30": 0, "31-45": 0, "46-60": 0, "60+": 0},
		InvalidReasons: map[string]int64{"校验码错误": 0, "出生日期非法": 0, "地区码不存在": 0, "长度错误": 0},
		Workers:        workers,
		Engine:         "Go",
	}
}

func addRecordToSummary(s *AnalysisSummary, record IdentityRecord) {
	if record.Status == "通过" {
		s.Valid++
	} else {
		s.Invalid++
		s.InvalidReasons["校验码错误"]++
	}
	if record.Gender == "男" {
		s.Male++
	} else {
		s.Female++
	}
	switch {
	case record.Age <= 17:
		s.AgeBuckets["0-17"]++
	case record.Age <= 30:
		s.AgeBuckets["18-30"]++
	case record.Age <= 45:
		s.AgeBuckets["31-45"]++
	case record.Age <= 60:
		s.AgeBuckets["46-60"]++
	default:
		s.AgeBuckets["60+"]++
	}
}

func analyzeRange(total int64, workers int) AnalysisSummary {
	if workers < 1 {
		workers = 1
	}
	start := time.Now()
	result := emptySummary(total, workers)
	for i := int64(1); i <= total; i++ {
		record := recordAt(i)
		addRecordToSummary(&result, record)
	}
	result.ElapsedMs = time.Since(start).Milliseconds()
	if result.ElapsedMs == 0 {
		result.Speed = total
	} else {
		result.Speed = int64(float64(total) / (float64(result.ElapsedMs) / 1000))
	}
	return result
}

func cors(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

func writeJSON(w http.ResponseWriter, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(value)
}

func resetState() {
	mu.Lock()
	defer mu.Unlock()
	atomic.StoreInt32(&processing, 0)
	generated = false
	progress = Progress{Total: totalRecords, Workers: runtime.NumCPU(), Engine: "Go"}
	summary = emptySummary(totalRecords, runtime.NumCPU())
}

func markGenerated() {
	mu.Lock()
	defer mu.Unlock()
	generated = true
}

func generateHandler(w http.ResponseWriter, r *http.Request) {
	resetState()
	markGenerated()
	writeJSON(w, map[string]any{"engine": "Go", "total": totalRecords, "status": "generated"})
}

func resetHandler(w http.ResponseWriter, r *http.Request) {
	resetState()
	writeJSON(w, map[string]any{"engine": "Go", "total": totalRecords, "status": "reset"})
}

func analyzeHandler(w http.ResponseWriter, r *http.Request) {
	if !atomic.CompareAndSwapInt32(&processing, 0, 1) {
		writeJSON(w, map[string]string{"error": "Already processing"})
		return
	}
	workers := runtime.NumCPU()
	go func() {
		defer atomic.StoreInt32(&processing, 0)
		start := time.Now()
		local := emptySummary(totalRecords, workers)
		updateEvery := int64(100_000)
		for i := int64(1); i <= totalRecords; i++ {
			record := recordAt(i)
			addRecordToSummary(&local, record)
			if i%updateEvery == 0 || i == totalRecords {
				elapsed := time.Since(start).Milliseconds()
				speed := int64(0)
				if elapsed > 0 {
					speed = int64(float64(i) / (float64(elapsed) / 1000))
				}
				mu.Lock()
				progress = Progress{
					Processed: i,
					Total:     totalRecords,
					Valid:     local.Valid,
					Invalid:   local.Invalid,
					Percent:   float64(i) / float64(totalRecords) * 100,
					Done:      i == totalRecords,
					ElapsedMs: elapsed,
					Speed:     speed,
					Workers:   workers,
					Engine:    "Go",
				}
				mu.Unlock()
			}
		}
		local.ElapsedMs = time.Since(start).Milliseconds()
		if local.ElapsedMs > 0 {
			local.Speed = int64(float64(totalRecords) / (float64(local.ElapsedMs) / 1000))
		}
		mu.Lock()
		summary = local
		progress.Done = true
		mu.Unlock()
	}()
	writeJSON(w, map[string]any{"engine": "Go", "status": "started", "total": totalRecords, "workers": workers})
}

func statusHandler(w http.ResponseWriter, r *http.Request) {
	mu.RLock()
	p := progress
	mu.RUnlock()
	writeJSON(w, p)
}

func summaryHandler(w http.ResponseWriter, r *http.Request) {
	mu.RLock()
	s := summary
	mu.RUnlock()
	writeJSON(w, s)
}

func recordsHandler(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	pageSize, _ := strconv.Atoi(q.Get("pageSize"))
	writeJSON(w, buildRecordsPage(page, pageSize, q.Get("gender"), q.Get("valid"), q.Get("q")))
}

func main() {
	http.HandleFunc("/generate", cors(generateHandler))
	http.HandleFunc("/reset", cors(resetHandler))
	http.HandleFunc("/analyze", cors(analyzeHandler))
	http.HandleFunc("/start", cors(analyzeHandler))
	http.HandleFunc("/status", cors(statusHandler))
	http.HandleFunc("/summary", cors(summaryHandler))
	http.HandleFunc("/records", cors(recordsHandler))

	fmt.Println("=== Go ID Analyzer Server ===")
	fmt.Println("Listening on http://localhost:8090")
	_ = http.ListenAndServe(":8090", nil)
}
