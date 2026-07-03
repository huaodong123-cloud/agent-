package main

import "testing"

func TestRecordAtDerivesBirthGenderAndValidity(t *testing.T) {
	record := recordAt(2)

	if record.Index != 2 {
		t.Fatalf("index = %d, want 2", record.Index)
	}
	if record.BirthDate == "" {
		t.Fatal("birth date should be derived")
	}
	if record.Gender != "男" && record.Gender != "女" {
		t.Fatalf("gender = %q, want 男 or 女", record.Gender)
	}
	if record.Status != "通过" && record.Status != "失败" {
		t.Fatalf("status = %q, want 通过 or 失败", record.Status)
	}
}

func TestBuildRecordsPageFiltersByGenderAndValidity(t *testing.T) {
	resetState()
	markGenerated()

	page := buildRecordsPage(1, 20, "男", "通过", "")

	if page.Page != 1 {
		t.Fatalf("page = %d, want 1", page.Page)
	}
	if page.PageSize != 20 {
		t.Fatalf("pageSize = %d, want 20", page.PageSize)
	}
	if len(page.Records) == 0 {
		t.Fatal("records should not be empty")
	}
	for _, record := range page.Records {
		if record.Gender != "男" {
			t.Fatalf("record gender = %q, want 男", record.Gender)
		}
		if record.Status != "通过" {
			t.Fatalf("record status = %q, want 通过", record.Status)
		}
	}
}

func TestAnalyzeTotalsAreStable(t *testing.T) {
	summary := analyzeRange(1000, 4)

	if summary.Total != 1000 {
		t.Fatalf("total = %d, want 1000", summary.Total)
	}
	if summary.Valid+summary.Invalid != summary.Total {
		t.Fatalf("valid + invalid = %d, want total %d", summary.Valid+summary.Invalid, summary.Total)
	}
	if summary.Male+summary.Female != summary.Total {
		t.Fatalf("male + female = %d, want total %d", summary.Male+summary.Female, summary.Total)
	}
	if len(summary.AgeBuckets) != 5 {
		t.Fatalf("age bucket count = %d, want 5", len(summary.AgeBuckets))
	}
}

func TestResetStateClearsPreviousProgress(t *testing.T) {
	progress = Progress{Processed: 10, Total: totalRecords, Valid: 9, Invalid: 1, Percent: 100, Done: true, ElapsedMs: 123, Speed: 10, Workers: 4, Engine: "Go"}
	summary = analyzeRange(10, 2)

	resetState()

	if progress.Processed != 0 {
		t.Fatalf("processed = %d, want 0", progress.Processed)
	}
	if progress.Done {
		t.Fatal("done should be false after reset")
	}
	if summary.Valid != 0 || summary.Invalid != 0 {
		t.Fatalf("summary valid/invalid = %d/%d, want 0/0", summary.Valid, summary.Invalid)
	}
}

func TestRecordsAreEmptyBeforeGenerate(t *testing.T) {
	resetState()

	page := buildRecordsPage(1, 20, "all", "all", "")

	if page.VisibleTotal != 0 {
		t.Fatalf("visibleTotal = %d, want 0", page.VisibleTotal)
	}
	if len(page.Records) != 0 {
		t.Fatalf("records length = %d, want 0", len(page.Records))
	}
}

func TestRecordsReturnAfterGenerate(t *testing.T) {
	resetState()
	markGenerated()

	page := buildRecordsPage(1, 20, "all", "all", "")

	if page.VisibleTotal == 0 {
		t.Fatal("visibleTotal should be positive after generate")
	}
	if len(page.Records) == 0 {
		t.Fatal("records should return after generate")
	}
}
