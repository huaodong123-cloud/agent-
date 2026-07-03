# Go vs Java 身份证批处理并发测试

这个项目用于录制 B 站视频：**清朝笔记本测试 Go 和 Java 并发效果**。

场景是生成 1000 万条中国身份证测试数据，然后分别用 Go 和 Java 分析身份证中的出生日期、年龄、性别和校验结果。前端提供左右分屏进度看板，以及 Go / Java 分程序完整数据浏览器。

## 项目结构

```text
.
├── id-verifier-go/          # Go 身份证分析服务，端口 8090
├── id-verifier-java/        # Java 身份证分析服务，端口 8091
├── id-verifier-frontend/    # 前端录屏看板
└── docs/                   # 实现计划文档
```

## 功能

- 生成 10,000,000 条身份证测试数据
- Go 和 Java 分别执行批处理分析
- 实时显示处理进度、耗时、吞吐量、无效数量
- 分析出生日期、年龄、性别、校验状态
- Go 数据视图和 Java 数据视图分开展示
- 支持分页、搜索、筛选、导出当前页 CSV
- 未生成数据前，明细表不会提前显示身份证

## 启动

### 1. 启动 Go 服务

```powershell
cd id-verifier-go
$env:GO111MODULE='off'
go run main.go
```

服务地址：

```text
http://localhost:8090
```

### 2. 启动 Java 服务

```powershell
cd id-verifier-java
javac IdVerifier.java
java IdVerifier
```

服务地址：

```text
http://localhost:8091
```

### 3. 启动前端

```powershell
cd id-verifier-frontend
python -m http.server 8088
```

打开：

```text
http://localhost:8088
```

## API

Go 和 Java 服务提供相同接口：

```text
POST /generate
POST /analyze
POST /reset
GET  /status
GET  /summary
GET  /records?page=1&pageSize=50&gender=all&valid=all&q=
```

说明：

- `/generate`：生成测试数据状态，允许前端开始展示明细
- `/analyze`：开始批处理分析
- `/reset`：清空生成状态和分析结果
- `/status`：实时进度
- `/summary`：汇总统计
- `/records`：分页读取当前程序的身份证明细

## 测试

Go：

```powershell
cd id-verifier-go
$env:GO111MODULE='off'
go test -vet=off
```

Java：

```powershell
cd id-verifier-java
javac IdVerifier.java IdVerifierTest.java
java IdVerifierTest
```

前端：

```powershell
cd id-verifier-frontend
node --check app.js
node frontend_contract_test.js
```

## 录屏流程

1. 打开前端页面
2. 点击“重置演示”，确认页面没有提前展示身份证明细
3. 点击“生成 1000 万测试数据”
4. 点击“同时启动 Go / Java 分析”
5. 观察左右进度、耗时和吞吐量
6. 切换底部 Go / Java 数据视图，展示分程序明细

## 注意

这个项目是演示型性能测试。测试结果只代表当前机器、当前任务和当前实现方式，不代表 Go 或 Java 在所有场景下的绝对性能。
