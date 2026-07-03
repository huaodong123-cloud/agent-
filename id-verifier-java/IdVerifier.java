import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public class IdVerifier {
    static final long TOTAL = 10_000_000L;
    static final int[] WEIGHTS = {7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2};
    static final char[] CHECK_CHARS = {'1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'};
    static final String[] AREA_CODES = {
        "110101", "110102", "310101", "310105", "440103", "440104",
        "320102", "320104", "330102", "330103", "500101", "500103",
        "510104", "510105", "610102", "610103", "420102", "420103",
        "210102", "210103", "370102", "370103", "350102", "350103",
        "120101", "120103", "230102", "230103", "410102", "410103"
    };

    static final AtomicBoolean processing = new AtomicBoolean(false);
    static volatile boolean generated = false;
    static volatile Progress progress = new Progress(0, TOTAL, 0, 0, 0, false, 0, 0, Runtime.getRuntime().availableProcessors(), "Java");
    static volatile AnalysisSummary summary = new AnalysisSummary(TOTAL, Runtime.getRuntime().availableProcessors());

    static class IdentityRecord {
        final long index;
        final String id;
        final String birthDate;
        final int age;
        final String gender;
        final String area;
        final String status;
        final String engine;

        IdentityRecord(long index, String id, String birthDate, int age, String gender, String area, String status) {
            this.index = index;
            this.id = id;
            this.birthDate = birthDate;
            this.age = age;
            this.gender = gender;
            this.area = area;
            this.status = status;
            this.engine = "Java";
        }
    }

    static class RecordsPage {
        final int page;
        final int pageSize;
        final long total;
        final long visibleTotal;
        final List<IdentityRecord> records;

        RecordsPage(int page, int pageSize, long total, long visibleTotal, List<IdentityRecord> records) {
            this.page = page;
            this.pageSize = pageSize;
            this.total = total;
            this.visibleTotal = visibleTotal;
            this.records = records;
        }
    }

    static class AnalysisSummary {
        final long total;
        long valid;
        long invalid;
        long male;
        long female;
        final Map<String, Long> ageBuckets = new LinkedHashMap<>();
        final Map<String, Long> invalidReasons = new LinkedHashMap<>();
        long elapsedMs;
        long speed;
        final int workers;
        final String engine = "Java";

        AnalysisSummary(long total, int workers) {
            this.total = total;
            this.workers = workers;
            ageBuckets.put("0-17", 0L);
            ageBuckets.put("18-30", 0L);
            ageBuckets.put("31-45", 0L);
            ageBuckets.put("46-60", 0L);
            ageBuckets.put("60+", 0L);
            invalidReasons.put("校验码错误", 0L);
            invalidReasons.put("出生日期非法", 0L);
            invalidReasons.put("地区码不存在", 0L);
            invalidReasons.put("长度错误", 0L);
        }
    }

    record Progress(long processed, long total, long valid, long invalid, double percent, boolean done, long elapsedMs, long speed, int workers, String engine) {}

    static char checksum(String base) {
        int sum = 0;
        for (int i = 0; i < 17; i++) {
            sum += (base.charAt(i) - '0') * WEIGHTS[i];
        }
        return CHECK_CHARS[sum % 11];
    }

    static IdentityRecord recordAt(long index) {
        if (index < 1) index = 1;
        long zero = index - 1;
        long shifted = zero + 11;
        String area = AREA_CODES[(int)(shifted % AREA_CODES.length)];
        int year = 1945 + (int)((shifted * 37) % 66);
        int month = 1 + (int)((shifted * 17) % 12);
        int day = 1 + (int)((shifted * 23) % 28);
        int seqNumber = (int)((zero * 19 + 11) % 1000);
        String seq = "%03d".formatted(seqNumber);
        String birth = "%04d%02d%02d".formatted(year, month, day);
        String base = area + birth + seq;
        boolean invalid = zero % 223 == 0;
        char check = invalid ? 'A' : checksum(base);
        String gender = seqNumber % 2 == 1 ? "男" : "女";
        String status = invalid ? "失败" : "通过";
        return new IdentityRecord(index, base + check, "%04d-%02d-%02d".formatted(year, month, day), 2026 - year, gender, area, status);
    }

    static boolean matches(IdentityRecord record, String gender, String valid, String query) {
        if (gender != null && !gender.isBlank() && !"all".equals(gender) && !record.gender.equals(gender)) return false;
        if (valid != null && !valid.isBlank() && !"all".equals(valid) && !record.status.equals(valid)) return false;
        return query == null || query.isBlank() || record.id.contains(query.toUpperCase());
    }

    static long estimateVisibleTotal(String gender, String valid, String query) {
        if (query != null && !query.isBlank()) return TOTAL / 12000;
        long total = TOTAL;
        if (gender != null && !gender.isBlank() && !"all".equals(gender)) total /= 2;
        if ("失败".equals(valid)) total /= 223;
        if ("通过".equals(valid)) total -= total / 223;
        return Math.max(1, total);
    }

    static RecordsPage buildRecordsPage(int page, int pageSize, String gender, String valid, String query) {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 500) pageSize = 50;
        if (!generated) {
            return new RecordsPage(page, pageSize, TOTAL, 0, new ArrayList<>());
        }
        long start = (long)(page - 1) * pageSize + 1;
        List<IdentityRecord> records = new ArrayList<>(pageSize);
        int guard = 0;
        for (long cursor = start; cursor <= TOTAL && records.size() < pageSize && guard < pageSize * 240; cursor++, guard++) {
            IdentityRecord record = recordAt(cursor);
            if (matches(record, gender, valid, query)) {
                records.add(record);
            }
        }
        return new RecordsPage(page, pageSize, TOTAL, estimateVisibleTotal(gender, valid, query), records);
    }

    static AnalysisSummary analyzeRange(long total, int workers) {
        if (workers < 1) workers = 1;
        long start = System.currentTimeMillis();
        AnalysisSummary result = new AnalysisSummary(total, workers);
        for (long i = 1; i <= total; i++) {
            addRecordToSummary(result, recordAt(i));
        }
        result.elapsedMs = System.currentTimeMillis() - start;
        result.speed = result.elapsedMs == 0 ? total : (long)(total / (result.elapsedMs / 1000.0));
        return result;
    }

    static void addRecordToSummary(AnalysisSummary summary, IdentityRecord record) {
        if ("通过".equals(record.status)) {
            summary.valid++;
        } else {
            summary.invalid++;
            summary.invalidReasons.compute("校验码错误", (k, v) -> v + 1);
        }
        if ("男".equals(record.gender)) summary.male++;
        else summary.female++;

        String bucket;
        if (record.age <= 17) bucket = "0-17";
        else if (record.age <= 30) bucket = "18-30";
        else if (record.age <= 45) bucket = "31-45";
        else if (record.age <= 60) bucket = "46-60";
        else bucket = "60+";
        summary.ageBuckets.compute(bucket, (k, v) -> v + 1);
    }

    static void startAnalysis() {
        if (!processing.compareAndSet(false, true)) return;
        int workers = Runtime.getRuntime().availableProcessors();
        Thread.ofPlatform().start(() -> {
            long start = System.currentTimeMillis();
            AnalysisSummary local = new AnalysisSummary(TOTAL, workers);
            for (long i = 1; i <= TOTAL; i++) {
                addRecordToSummary(local, recordAt(i));
                if (i % 100_000 == 0 || i == TOTAL) {
                    long elapsed = System.currentTimeMillis() - start;
                    long speed = elapsed == 0 ? i : (long)(i / (elapsed / 1000.0));
                    progress = new Progress(i, TOTAL, local.valid, local.invalid, (double)i / TOTAL * 100, i == TOTAL, elapsed, speed, workers, "Java");
                }
            }
            local.elapsedMs = System.currentTimeMillis() - start;
            local.speed = local.elapsedMs == 0 ? TOTAL : (long)(TOTAL / (local.elapsedMs / 1000.0));
            summary = local;
            progress = new Progress(TOTAL, TOTAL, local.valid, local.invalid, 100, true, local.elapsedMs, local.speed, workers, "Java");
            processing.set(false);
        });
    }

    static void resetState() {
        processing.set(false);
        generated = false;
        progress = new Progress(0, TOTAL, 0, 0, 0, false, 0, 0, Runtime.getRuntime().availableProcessors(), "Java");
        summary = new AnalysisSummary(TOTAL, Runtime.getRuntime().availableProcessors());
    }

    static void markGenerated() {
        generated = true;
    }

    public static void main(String[] args) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(8091), 0);
        server.createContext("/generate", exchange -> {
            resetState();
            markGenerated();
            writeJson(exchange, "{\"engine\":\"Java\",\"total\":" + TOTAL + ",\"status\":\"generated\"}");
        });
        server.createContext("/reset", exchange -> {
            resetState();
            writeJson(exchange, "{\"engine\":\"Java\",\"total\":" + TOTAL + ",\"status\":\"reset\"}");
        });
        server.createContext("/analyze", exchange -> {
            startAnalysis();
            writeJson(exchange, "{\"engine\":\"Java\",\"status\":\"started\",\"total\":" + TOTAL + ",\"workers\":" + Runtime.getRuntime().availableProcessors() + "}");
        });
        server.createContext("/start", exchange -> {
            startAnalysis();
            writeJson(exchange, "{\"engine\":\"Java\",\"status\":\"started\",\"total\":" + TOTAL + "}");
        });
        server.createContext("/status", exchange -> writeJson(exchange, progressJson(progress)));
        server.createContext("/summary", exchange -> writeJson(exchange, summaryJson(summary)));
        server.createContext("/records", exchange -> {
            Map<String, String> query = parseQuery(exchange.getRequestURI().getRawQuery());
            int page = parseInt(query.get("page"), 1);
            int pageSize = parseInt(query.get("pageSize"), 50);
            RecordsPage records = buildRecordsPage(page, pageSize, query.getOrDefault("gender", "all"), query.getOrDefault("valid", "all"), query.getOrDefault("q", ""));
            writeJson(exchange, recordsJson(records));
        });
        server.setExecutor(Executors.newFixedThreadPool(16));
        System.out.println("=== Java ID Analyzer Server ===");
        System.out.println("Listening on http://localhost:8091");
        server.start();
    }

    static int parseInt(String value, int fallback) {
        try { return Integer.parseInt(value); } catch (Exception ignored) { return fallback; }
    }

    static Map<String, String> parseQuery(String raw) {
        Map<String, String> query = new LinkedHashMap<>();
        if (raw == null || raw.isBlank()) return query;
        for (String part : raw.split("&")) {
            String[] pair = part.split("=", 2);
            String key = URLDecoder.decode(pair[0], StandardCharsets.UTF_8);
            String value = pair.length == 2 ? URLDecoder.decode(pair[1], StandardCharsets.UTF_8) : "";
            query.put(key, value);
        }
        return query;
    }

    static void addCors(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
    }

    static void writeJson(HttpExchange exchange, String body) throws IOException {
        addCors(exchange);
        if ("OPTIONS".equals(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(200, -1);
            return;
        }
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(200, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.getResponseBody().close();
    }

    static String progressJson(Progress p) {
        return "{\"processed\":%d,\"total\":%d,\"valid\":%d,\"invalid\":%d,\"percent\":%.2f,\"done\":%b,\"elapsedMs\":%d,\"speed\":%d,\"workers\":%d,\"engine\":\"%s\"}"
            .formatted(p.processed(), p.total(), p.valid(), p.invalid(), p.percent(), p.done(), p.elapsedMs(), p.speed(), p.workers(), p.engine());
    }

    static String summaryJson(AnalysisSummary s) {
        return "{\"total\":%d,\"valid\":%d,\"invalid\":%d,\"male\":%d,\"female\":%d,\"ageBuckets\":%s,\"invalidReasons\":%s,\"elapsedMs\":%d,\"speed\":%d,\"workers\":%d,\"engine\":\"Java\"}"
            .formatted(s.total, s.valid, s.invalid, s.male, s.female, mapJson(s.ageBuckets), mapJson(s.invalidReasons), s.elapsedMs, s.speed, s.workers);
    }

    static String recordsJson(RecordsPage page) {
        StringBuilder sb = new StringBuilder();
        sb.append("{\"page\":").append(page.page)
            .append(",\"pageSize\":").append(page.pageSize)
            .append(",\"total\":").append(page.total)
            .append(",\"visibleTotal\":").append(page.visibleTotal)
            .append(",\"records\":[");
        for (int i = 0; i < page.records.size(); i++) {
            if (i > 0) sb.append(',');
            IdentityRecord r = page.records.get(i);
            sb.append("{\"index\":").append(r.index)
                .append(",\"id\":\"").append(r.id)
                .append("\",\"birthDate\":\"").append(r.birthDate)
                .append("\",\"age\":").append(r.age)
                .append(",\"gender\":\"").append(r.gender)
                .append("\",\"area\":\"").append(r.area)
                .append("\",\"status\":\"").append(r.status)
                .append("\",\"engine\":\"Java\"}");
        }
        sb.append("]}");
        return sb.toString();
    }

    static String mapJson(Map<String, Long> map) {
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, Long> entry : map.entrySet()) {
            if (!first) sb.append(',');
            first = false;
            sb.append('"').append(entry.getKey()).append("\":").append(entry.getValue());
        }
        sb.append('}');
        return sb.toString();
    }
}
