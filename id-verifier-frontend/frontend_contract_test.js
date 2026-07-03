const fs = require("fs");
const assert = require("assert");

const source = fs.readFileSync("app.js", "utf8");

assert(source.includes("const API_BASES"), "app.js should define per-engine API base URLs");
assert(source.includes("async function fetchRecordsFromService"), "app.js should fetch records from the active backend");
assert(source.includes("/records?"), "app.js should call the unified /records endpoint");
assert(source.includes("loadBackendRecords"), "app.js should load backend data for Go and Java tabs");
assert(source.includes("callBothEngines(\"/generate\""), "app.js should generate data through both backends");
assert(source.includes("callBothEngines(\"/analyze\""), "app.js should start analysis through both backends");
assert(source.includes("pollBackendStatus"), "app.js should poll Go and Java progress from /status");

console.log("frontend contract PASS");
