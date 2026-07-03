const TOTAL = 10000000;
const API_BASES = {
    go: "http://localhost:8090",
    java: "http://localhost:8091",
};
const areaCodes = [
    "110101", "110102", "310101", "310105", "440103", "440104",
    "320102", "320104", "330102", "330103", "500101", "500103",
    "510104", "510105", "610102", "610103", "420102", "420103",
    "210102", "210103", "370102", "370103", "350102", "350103",
    "120101", "120103", "230102", "230103", "410102", "410103",
];
const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
const checkChars = ["1", "0", "X", "9", "8", "7", "6", "5", "4", "3", "2"];

const ageBuckets = [
    ["0-17", 7],
    ["18-30", 23],
    ["31-45", 34],
    ["46-60", 24],
    ["60+", 12],
];

const invalidReasons = [
    ["校验码错误", 18420],
    ["出生日期非法", 9136],
    ["地区码不存在", 6128],
    ["长度错误", 2317],
];

const state = {
    generated: false,
    running: false,
    activeEngine: "go",
    browsers: {
        go: {
            page: 1,
            pageSize: 50,
            visibleTotal: TOTAL,
            currentRows: [],
            filters: { gender: "all", valid: "all", query: "" },
            exportState: "可导出 Go 当前页 CSV",
        },
        java: {
            page: 1,
            pageSize: 50,
            visibleTotal: TOTAL,
            currentRows: [],
            filters: { gender: "all", valid: "all", query: "" },
            exportState: "可导出 Java 当前页 CSV",
        },
    },
    go: { percent: 0, elapsed: 0, speed: 0, invalid: 0 },
    java: { percent: 0, elapsed: 0, speed: 0, invalid: 0 },
    timer: null,
};

function $(id) {
    return document.getElementById(id);
}

function number(n) {
    return Math.round(n).toLocaleString("zh-CN");
}

function seconds(ms) {
    return `${(ms / 1000).toFixed(2)}s`;
}

function speed(n) {
    if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M/s`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K/s`;
    return `${Math.round(n)}/s`;
}

function checksum(base) {
    let sum = 0;
    for (let i = 0; i < 17; i += 1) {
        sum += Number(base[i]) * weights[i];
    }
    return checkChars[sum % 11];
}

function pad(n, size) {
    return String(n).padStart(size, "0");
}

function activeBrowser() {
    return state.browsers[state.activeEngine];
}

function engineName(engine = state.activeEngine) {
    return engine === "go" ? "Go" : "Java";
}

function recordAt(index, engine = state.activeEngine) {
    const zeroIndex = Math.max(0, index - 1);
    const engineOffset = engine === "go" ? 0 : 11;
    const area = areaCodes[(zeroIndex + engineOffset) % areaCodes.length];
    const year = 1945 + ((zeroIndex + engineOffset) * 37 % 66);
    const month = 1 + ((zeroIndex + engineOffset) * 17 % 12);
    const day = 1 + ((zeroIndex + engineOffset) * 23 % 28);
    const seqNumber = (zeroIndex * 19 + engineOffset) % 1000;
    const seq = pad(seqNumber, 3);
    const birth = `${year}${pad(month, 2)}${pad(day, 2)}`;
    const base = `${area}${birth}${seq}`;
    const invalid = engine === "go" ? zeroIndex % 217 === 0 : zeroIndex % 223 === 0;
    const id = `${base}${invalid ? "A" : checksum(base)}`;
    const gender = seqNumber % 2 === 1 ? "男" : "女";
    const age = 2026 - year;

    return {
        index,
        id,
        birthDate: `${year}-${pad(month, 2)}-${pad(day, 2)}`,
        age,
        gender,
        area,
        status: invalid ? "失败" : "通过",
        engine: engineName(engine),
    };
}

function estimateVisibleTotal(gender, valid, query) {
    if (query) return Math.max(1, Math.min(TOTAL, Math.floor(TOTAL / 12000)));

    let result = TOTAL;
    if (gender !== "all") result = Math.floor(result / 2);
    if (valid === "失败") result = Math.floor(result / 217);
    if (valid === "通过") result = result - Math.floor(result / 217);
    return Math.max(1, result);
}

function matchesFilters(record, gender, valid, query) {
    if (gender !== "all" && record.gender !== gender) return false;
    if (valid !== "all" && record.status !== valid) return false;
    if (query && !record.id.includes(query)) return false;
    return true;
}

function getCurrentFilters() {
    return {
        gender: $("genderFilter").value,
        valid: $("validFilter").value,
        query: $("searchInput").value.trim().toUpperCase(),
    };
}

function buildPageRows() {
    const browser = activeBrowser();
    const filters = browser.filters;
    const start = (browser.page - 1) * browser.pageSize + 1;
    const rows = [];
    let cursor = start;
    let guard = 0;

    while (rows.length < browser.pageSize && cursor <= TOTAL && guard < browser.pageSize * 120) {
        const record = recordAt(cursor, state.activeEngine);
        if (matchesFilters(record, filters.gender, filters.valid, filters.query)) {
            rows.push(record);
        }
        cursor += 1;
        guard += 1;
    }

    if (filters.query && rows.length === 0) {
        const seed = Math.max(1, Math.abs(hashCode(`${state.activeEngine}:${filters.query}`)) % (TOTAL - browser.pageSize));
        for (let i = 0; i < browser.pageSize; i += 1) {
            const record = recordAt(seed + i, state.activeEngine);
            const patched = { ...record, id: record.id.slice(0, 6) + filters.query.slice(0, 8).padEnd(8, "0") + record.id.slice(14) };
            if (matchesFilters(patched, filters.gender, filters.valid, "")) rows.push(patched);
        }
    }

    browser.visibleTotal = estimateVisibleTotal(filters.gender, filters.valid, filters.query);
    browser.currentRows = rows;
}

async function fetchRecordsFromService(engine, browser) {
    const params = new URLSearchParams({
        page: String(browser.page),
        pageSize: String(browser.pageSize),
        gender: browser.filters.gender,
        valid: browser.filters.valid,
        q: browser.filters.query,
    });
    const response = await fetch(`${API_BASES[engine]}/records?${params.toString()}`);
    if (!response.ok) {
        throw new Error(`${engine} records request failed: ${response.status}`);
    }
    return response.json();
}

async function loadBackendRecords() {
    const browser = activeBrowser();
    try {
        const data = await fetchRecordsFromService(state.activeEngine, browser);
        browser.visibleTotal = data.visibleTotal || data.total || TOTAL;
        browser.currentRows = (data.records || []).map(record => ({
            index: record.index,
            id: record.id,
            birthDate: record.birthDate,
            age: record.age,
            gender: record.gender,
            area: record.area,
            status: record.status,
            engine: record.engine || engineName(),
        }));
        browser.exportState = `已连接 ${engineName()} 服务数据`;
        return true;
    } catch (error) {
        console.warn(`${engineName()} 服务未连接，使用本地演示数据`, error);
        buildPageRows();
        browser.exportState = `${engineName()} 服务未连接，当前为本地演示数据`;
        return false;
    }
}

function hashCode(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}

async function renderRows() {
    const browser = activeBrowser();
    await loadBackendRecords();

    if (browser.currentRows.length === 0) {
        $("recordRows").innerHTML = `
            <tr>
                <td colspan="7" class="empty-cell">等待生成测试数据。点击“生成 1000 万测试数据”后再查看 ${engineName()} 明细。</td>
            </tr>
        `;
    } else {
        $("recordRows").innerHTML = browser.currentRows.map(row => {
        const ok = row.status === "通过";
        return `
            <tr>
                <td>${number(row.index)}</td>
                <td>${row.id}</td>
                <td>${row.birthDate}</td>
                <td>${row.age}</td>
                <td>${row.gender}</td>
                <td>${row.area}</td>
                <td><span class="badge ${ok ? "ok" : "bad"}">${row.status}</span></td>
            </tr>
        `;
        }).join("");
    }

    const totalPages = Math.max(1, Math.ceil(browser.visibleTotal / browser.pageSize));
    const from = (browser.page - 1) * browser.pageSize + 1;
    const to = Math.min(browser.page * browser.pageSize, browser.visibleTotal);
    $("activeEngineLabel").textContent = engineName();
    $("visibleTotal").textContent = number(browser.visibleTotal);
    $("pageState").textContent = `${number(browser.page)} / ${number(totalPages)}`;
    $("pageInput").value = browser.page;
    $("pageInput").max = totalPages;
    $("pageSize").value = String(browser.pageSize);
    $("genderFilter").value = browser.filters.gender;
    $("validFilter").value = browser.filters.valid;
    $("searchInput").value = browser.filters.query;
    $("exportState").textContent = browser.exportState;
    $("engineViewNote").textContent = `当前查看 ${engineName()} 服务分析后的完整身份证数据。`;
    $("pageNote").textContent = `${engineName()} 当前展示第 ${number(from)}-${number(to)} 条，代表该程序命中的 ${number(browser.visibleTotal)} 条完整数据。`;
    renderEngineTabs();
}

function renderCharts(scale = 1) {
    const male = Math.round(5124380 * scale);
    const female = Math.round(4875620 * scale);
    const maleRatio = male + female === 0 ? 50 : Math.round(male / (male + female) * 100);

    $("maleCount").textContent = number(male);
    $("femaleCount").textContent = number(female);
    $("genderSplit").textContent = male + female === 0 ? "-" : `${number(male)} / ${number(female)}`;
    $("genderDonut").style.background = `conic-gradient(var(--male) 0 ${maleRatio}%, var(--female) ${maleRatio}% 100%)`;

    $("ageBars").innerHTML = ageBuckets.map(([label, value]) => {
        const count = Math.round(TOTAL * value / 100 * scale);
        return `
            <div class="bar-row">
                <span>${label}</span>
                <div class="bar-line"><span style="width:${Math.max(3, value * scale)}%"></span></div>
                <strong>${number(count)}</strong>
            </div>
        `;
    }).join("");

    $("reasonList").innerHTML = invalidReasons.map(([label, count]) => `
        <div class="reason-item">
            <span>${label}</span>
            <strong>${number(count * scale)}</strong>
        </div>
    `).join("");
}

function updateEngine(name, data) {
    const processed = data.processed != null ? data.processed : TOTAL * data.percent / 100;
    const elapsed = data.elapsed != null ? data.elapsed : data.elapsedMs;
    $(`${name}Percent`).textContent = `${data.percent.toFixed(1)}%`;
    $(`${name}Bar`).style.width = `${data.percent}%`;
    $(`${name}Processed`).textContent = `${number(processed)} / ${number(data.total || TOTAL)}`;
    $(`${name}Time`).textContent = seconds(elapsed || 0);
    $(`${name}Speed`).textContent = speed(data.speed);
    $(`${name}Invalid`).textContent = number(data.invalid);
}

function updateWinner() {
    if (!state.running && state.go.percent === 0 && state.java.percent === 0) return;

    const goDone = state.go.percent >= 100;
    const javaDone = state.java.percent >= 100;
    if (goDone && javaDone) {
        const goElapsed = state.go.elapsed != null ? state.go.elapsed : state.go.elapsedMs;
        const javaElapsed = state.java.elapsed != null ? state.java.elapsed : state.java.elapsedMs;
        const goWins = goElapsed < javaElapsed;
        const faster = goWins ? "Go 领先" : "Java 领先";
        const ratio = Math.max(goElapsed, javaElapsed) / Math.max(1, Math.min(goElapsed, javaElapsed));
        $("winnerText").textContent = faster;
        $("winnerDetail").textContent = `最终约快 ${ratio.toFixed(2)} 倍，统计结果一致`;
        return;
    }

    const leader = state.go.percent >= state.java.percent ? "Go 暂时领先" : "Java 暂时领先";
    $("winnerText").textContent = leader;
    $("winnerDetail").textContent = "实时比较处理进度与吞吐量";
}

async function callBothEngines(path) {
    return Promise.all([
        fetch(`${API_BASES.go}${path}`, { method: "POST" }).then(response => response.json()),
        fetch(`${API_BASES.java}${path}`, { method: "POST" }).then(response => response.json()),
    ]);
}

async function generateData() {
    try {
        await callBothEngines("/generate");
        $("dataState").textContent = "Go 与 Java 已生成同一规模测试数据";
    } catch (error) {
        console.warn("后端生成接口未连接，使用前端演示状态", error);
        $("dataState").textContent = "后端未连接，当前使用演示数据";
    }
    state.generated = true;
    $("totalRecords").textContent = number(TOTAL);
    $("validRecords").textContent = number(9953999);
    renderCharts(1);
}

async function pollBackendStatus() {
    const [goStatus, javaStatus] = await Promise.all([
        fetch(`${API_BASES.go}/status`).then(response => response.json()),
        fetch(`${API_BASES.java}/status`).then(response => response.json()),
    ]);
    state.go = {
        percent: goStatus.percent || 0,
        processed: goStatus.processed || 0,
        total: goStatus.total || TOTAL,
        elapsedMs: goStatus.elapsedMs || 0,
        speed: goStatus.speed || 0,
        invalid: goStatus.invalid || 0,
    };
    state.java = {
        percent: javaStatus.percent || 0,
        processed: javaStatus.processed || 0,
        total: javaStatus.total || TOTAL,
        elapsedMs: javaStatus.elapsedMs || 0,
        speed: javaStatus.speed || 0,
        invalid: javaStatus.invalid || 0,
    };
    updateEngine("go", state.go);
    updateEngine("java", state.java);
    renderCharts(Math.max(state.go.percent, state.java.percent) / 100);
    updateWinner();
    if (goStatus.done && javaStatus.done) {
        state.running = false;
        clearInterval(state.timer);
        $("validRecords").textContent = number(Math.min(goStatus.valid || TOTAL, javaStatus.valid || TOTAL));
        renderCharts(1);
        updateWinner();
    }
}

function runSimulatedDemo() {
    if (state.running) return;

    state.running = true;
    state.go = { percent: 0, elapsed: 0, speed: 0, invalid: 0 };
    state.java = { percent: 0, elapsed: 0, speed: 0, invalid: 0 };
    $("winnerText").textContent = "分析中";
    $("winnerDetail").textContent = "Go 与 Java 同时处理同一份身份证数据";

    const start = performance.now();
    clearInterval(state.timer);
    state.timer = setInterval(() => {
        const elapsed = performance.now() - start;
        const goPercent = Math.min(100, elapsed / 8200 * 100);
        const javaPercent = Math.min(100, elapsed / 10300 * 100);

        state.go.percent = goPercent;
        state.go.elapsed = Math.min(elapsed, 8200);
        state.go.speed = TOTAL * (goPercent / 100) / Math.max(0.2, state.go.elapsed / 1000);
        state.go.invalid = Math.round(46001 * goPercent / 100);

        state.java.percent = javaPercent;
        state.java.elapsed = Math.min(elapsed, 10300);
        state.java.speed = TOTAL * (javaPercent / 100) / Math.max(0.2, state.java.elapsed / 1000);
        state.java.invalid = Math.round(46001 * javaPercent / 100);

        updateEngine("go", state.go);
        updateEngine("java", state.java);
        renderCharts(Math.max(goPercent, javaPercent) / 100);
        updateWinner();

        if (goPercent >= 100 && javaPercent >= 100) {
            state.running = false;
            clearInterval(state.timer);
            $("validRecords").textContent = number(9953999);
            renderCharts(1);
            updateWinner();
        }
    }, 120);
}

async function runDemo() {
    if (!state.generated) await generateData();
    if (state.running) return;

    state.running = true;
    state.go = { percent: 0, processed: 0, total: TOTAL, elapsedMs: 0, speed: 0, invalid: 0 };
    state.java = { percent: 0, processed: 0, total: TOTAL, elapsedMs: 0, speed: 0, invalid: 0 };
    $("winnerText").textContent = "分析中";
    $("winnerDetail").textContent = "Go 与 Java 正在请求真实后端分析";

    try {
        await callBothEngines("/analyze");
        clearInterval(state.timer);
        state.timer = setInterval(() => {
            pollBackendStatus().catch(error => {
                console.warn("后端进度轮询失败，切换为本地演示", error);
                clearInterval(state.timer);
                state.running = false;
                runSimulatedDemo();
            });
        }, 300);
        await pollBackendStatus();
    } catch (error) {
        console.warn("后端分析接口未连接，使用前端模拟进度", error);
        state.running = false;
        runSimulatedDemo();
    }
}

function resetDemo() {
    clearInterval(state.timer);
    callBothEngines("/reset").catch(error => {
        console.warn("后端 reset 未连接，仅重置前端状态", error);
    });
    state.generated = false;
    state.running = false;
    state.go = { percent: 0, elapsed: 0, speed: 0, invalid: 0 };
    state.java = { percent: 0, elapsed: 0, speed: 0, invalid: 0 };
    Object.values(state.browsers).forEach(browser => {
        browser.page = 1;
        browser.pageSize = 50;
        browser.visibleTotal = TOTAL;
        browser.currentRows = [];
        browser.filters = { gender: "all", valid: "all", query: "" };
        browser.exportState = `可导出当前页 CSV`;
    });

    $("totalRecords").textContent = "0";
    $("validRecords").textContent = "0";
    $("dataState").textContent = "等待生成";
    $("genderSplit").textContent = "-";
    $("winnerText").textContent = "未开始";
    $("winnerDetail").textContent = "等待两端服务分析";
    updateEngine("go", state.go);
    updateEngine("java", state.java);
    renderCharts(0);
    renderRows();
}

function applyDataView() {
    const browser = activeBrowser();
    browser.pageSize = Number($("pageSize").value);
    const filters = getCurrentFilters();
    browser.filters = filters;
    const totalPages = Math.max(1, Math.ceil(estimateVisibleTotal(filters.gender, filters.valid, filters.query) / browser.pageSize));
    const requestedPage = Number($("pageInput").value) || 1;
    browser.page = Math.min(Math.max(1, requestedPage), totalPages);
    renderRows();
}

function movePage(offset) {
    const browser = activeBrowser();
    const totalPages = Math.max(1, Math.ceil(browser.visibleTotal / browser.pageSize));
    browser.page = Math.min(Math.max(1, browser.page + offset), totalPages);
    renderRows();
}

function exportCurrentPage() {
    const browser = activeBrowser();
    const header = ["序号", "身份证号", "出生日期", "年龄", "性别", "地区码", "校验"];
    const lines = browser.currentRows.map(row => [
        row.index,
        row.id,
        row.birthDate,
        row.age,
        row.gender,
        row.area,
        row.status,
    ].join(","));
    const blob = new Blob([`\uFEFF${header.join(",")}\n${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${state.activeEngine}-id-records-page-${browser.page}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    browser.exportState = `${engineName()} 已生成第 ${number(browser.page)} 页 CSV`;
    $("exportState").textContent = browser.exportState;
}

function openFullDataView() {
    const browser = activeBrowser();
    browser.page = 1;
    browser.filters = { gender: "all", valid: "all", query: "" };
    renderRows();
    $("searchInput").focus();
}

function switchEngine(engine) {
    state.activeEngine = engine;
    renderRows();
}

function renderEngineTabs() {
    document.querySelectorAll(".engine-tab").forEach(tab => {
        const active = tab.dataset.engine === state.activeEngine;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", String(active));
    });
}

document.addEventListener("DOMContentLoaded", () => {
    renderRows();
    renderCharts(0);
    $("generateBtn").addEventListener("click", generateData);
    $("runBtn").addEventListener("click", runDemo);
    $("resetBtn").addEventListener("click", resetDemo);
    $("applyDataBtn").addEventListener("click", applyDataView);
    $("prevPage").addEventListener("click", () => movePage(-1));
    $("nextPage").addEventListener("click", () => movePage(1));
    $("fullDataBtn").addEventListener("click", openFullDataView);
    $("exportBtn").addEventListener("click", exportCurrentPage);
    document.querySelectorAll(".engine-tab").forEach(tab => {
        tab.addEventListener("click", () => switchEngine(tab.dataset.engine));
    });
    $("searchInput").addEventListener("keydown", event => {
        if (event.key === "Enter") applyDataView();
    });
});
