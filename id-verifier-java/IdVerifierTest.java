public class IdVerifierTest {
    public static void main(String[] args) {
        testRecordAtDerivesBirthGenderAndValidity();
        testBuildRecordsPageFiltersByGenderAndValidity();
        testAnalyzeTotalsAreStable();
        testResetStateClearsPreviousProgress();
        testRecordsAreEmptyBeforeGenerate();
        testRecordsReturnAfterGenerate();
        System.out.println("IdVerifierTest PASS");
    }

    static void testRecordAtDerivesBirthGenderAndValidity() {
        IdVerifier.IdentityRecord record = IdVerifier.recordAt(2);
        require(record.index == 2, "index should be 2");
        require(!record.birthDate.isBlank(), "birth date should be derived");
        require(record.gender.equals("男") || record.gender.equals("女"), "gender should be derived");
        require(record.status.equals("通过") || record.status.equals("失败"), "status should be derived");
    }

    static void testBuildRecordsPageFiltersByGenderAndValidity() {
        IdVerifier.resetState();
        IdVerifier.markGenerated();

        IdVerifier.RecordsPage page = IdVerifier.buildRecordsPage(1, 20, "男", "通过", "");
        require(page.page == 1, "page should be 1");
        require(page.pageSize == 20, "pageSize should be 20");
        require(!page.records.isEmpty(), "records should not be empty");
        for (IdVerifier.IdentityRecord record : page.records) {
            require(record.gender.equals("男"), "record gender should be 男");
            require(record.status.equals("通过"), "record status should be 通过");
        }
    }

    static void testAnalyzeTotalsAreStable() {
        IdVerifier.AnalysisSummary summary = IdVerifier.analyzeRange(1000, 4);
        require(summary.total == 1000, "total should be 1000");
        require(summary.valid + summary.invalid == summary.total, "valid + invalid should equal total");
        require(summary.male + summary.female == summary.total, "male + female should equal total");
        require(summary.ageBuckets.size() == 5, "age bucket count should be 5");
    }

    static void testResetStateClearsPreviousProgress() {
        IdVerifier.progress = new IdVerifier.Progress(10, 10_000_000L, 9, 1, 100, true, 123, 10, 4, "Java");
        IdVerifier.summary = IdVerifier.analyzeRange(10, 2);
        IdVerifier.resetState();
        require(IdVerifier.progress.processed() == 0, "processed should be 0 after reset");
        require(!IdVerifier.progress.done(), "done should be false after reset");
        require(IdVerifier.summary.valid == 0, "summary valid should be 0 after reset");
        require(IdVerifier.summary.invalid == 0, "summary invalid should be 0 after reset");
    }

    static void testRecordsAreEmptyBeforeGenerate() {
        IdVerifier.resetState();
        IdVerifier.RecordsPage page = IdVerifier.buildRecordsPage(1, 20, "all", "all", "");
        require(page.visibleTotal == 0, "visibleTotal should be 0 before generate");
        require(page.records.isEmpty(), "records should be empty before generate");
    }

    static void testRecordsReturnAfterGenerate() {
        IdVerifier.resetState();
        IdVerifier.markGenerated();
        IdVerifier.RecordsPage page = IdVerifier.buildRecordsPage(1, 20, "all", "all", "");
        require(page.visibleTotal > 0, "visibleTotal should be positive after generate");
        require(!page.records.isEmpty(), "records should return after generate");
    }

    static void require(boolean condition, String message) {
        if (!condition) {
            throw new AssertionError(message);
        }
    }
}
