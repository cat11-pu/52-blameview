# blameview

浏览器单页工作台（原生 ES 模块，零依赖）。

## 起服务看页面

    python3 -m http.server 8000

浏览器打开 http://127.0.0.1:8000/ ，改样例点运行看结果。

## 测试

    node tests/run.js

## 场景自检

    node check_sample.js

## 归属模型

- `blame.blame(commits, fileLines)` 按提交顺序推进：同一位置的行内容与上一版
  相同则沿用原归属，不同或新增归当前提交；返回 `owner` 与 `unknown`。
- `moves.incremental(commits, fileLines, knownMoves, from)` 复用同一引擎：
  `from` 之前视为已缓存前缀，窗口内只重算受影响行（`reblamed`，即预算消耗）。
  移动区间（源取上一版、目标取当前提交）内容一致时目标行沿用源行归属，
  不算新写；区间越界或引用未知提交抛 `E_UNKNOWN_COMMIT`。
- 不变量：任意 `from` 的增量结果与 `from=0` 的从头全量推进逐行一致，
  即 `render` 里的 `consistent`。
