あなたは優秀なプログラマー、データーベースを使用したWebアプリケーション開発が得意です。

あなたは現在のフォルダーにあるPostgresベースのWebアプリをDb2ベースに変更します。
以下の点に考慮して実施します。下記が今現在のPostgresベースのWebアプリに実装されていなくても、Db2アプリには実装するようにしてください。
これ以外でもDb2アプリとして重要機能は、PostgresベースのWebアプリに実装されていなくても、Db2アプリには実装するようにしてください。

# Planで作成するドキュメントの注意点
作成するドキュメントは時間短縮のため、必要最低限のファイルで簡潔なものにしてください。アーキテクチャ図やクイックリファレンスなどは作成しないでください。

# 実装にあたっての注意点
- 使用するDb2のバージョンはv12.1です。
- 今現在はPostgresベースの書き方です。変更後は[ibm_db API](https://github.com/ibmdb/node-ibm_db/blob/master/APIDocumentation.md) を使用します。想像でコーディングせず、必ずAPIドキュメントを確認してから正しい実装してください。

- `ibm_db` の API は他の DB ドライバと異なる。実装前に必ず `ibm_db` の公式ドキュメントまたは実際のオブジェクトのメソッド一覧を確認すること。

- SQLだけでなく、コネクションやトランザクションの管理も考えてDb2に移行します。また何度も接続が不要なようにコネクションプールを実装します。

- Db2のテーブルの英数字のカラム名の処理は、大文字で行ってください

- Db2テーブルの指定はスキーマ名を含めて行います。スキーマ名とテーブル名の両方をパラメータ（環境変数）で指定できるようにします。

- 必要な環境変数が設定されてない場合は.envから読み取るようにしてください

- テストに必要なDb2接続情報は, 以下の環境変数を使用します。
    - db名: DB2_DATABASE
    - 接続先hostname: DB2_HOSTNAME
    - 接続先port: DB2_PORT
    - DB userid: DB2_UID
    - DB password: DB2_PWD
    - DB2接続プロトコル: DB2_PROTOCOL
    - Db2Security type: DB2_SECURITY
    - ToDoテーブルスキーマ名: DB2_SCHEMA
    - ToDoテーブル名:DB2_TABLE_TODOS

- テストに必要なコネクションプールのDb2接続数情報は, 以下の環境変数を使用します。　環境変数が設定されていない場合は、最大数5、最小数1としてください。
    - 最大接続数: DB2_MAX_CONNECTIONS=5
    - 最小接続数: DB2_MIN_CONNECTIONS=1

- テーブル作成スクリプトを準備してください

- GUIは基本同じで良いのですが、タイトルや説明をDb2の内容に則してわかるように変更してください。index.htmlの<head>内の<title>も忘れずにDb2の内容に変更してください。

- Db2はPostgresに比べて、DB接続の取得に時間がかかります。そのため、接続取得中など時間がかかり画面操作をしても処理ができない場合は、ボタンや入力をDisableにして、操作ができない状態にし、「処理中、お待ちください」などのメッセージを、説明エリアの下に表示してください。

- 実装計画書（implement-plan.md）には、セキュリティ上の理由から具体的な接続情報（ホスト名、ユーザーID、パスワード等）を記載しないでください。テスト実行時の参照先のみを明記してください。


- エラー発生時は、原因がわかるようにエラーメッセージを標準出力に出すようにしてください。

- コード変更だけでなく、テストコードも作成し、確実に動作することを保証してください。
- テストコードでも接続情報やアプリのport番号などの情報は、環境変数から取得するようにしてください。

- テストコードによる自動テストに加え、以下の手動確認も実施してください：
  - `npm run dev` でサーバーが正常起動すること（ポート競合なし）
  - `npm start` で本番起動できること
  - テスト実行後にサーバーを起動しても問題ないこと

- 最後にテストコードを使用したテストも実際に実施し、実行に問題ないことを確認してください。

# 🚨 重要：テスト実施は必須

**実装完了の定義**: 以下の**全てのテストを実施**し、成功することが実装完了の条件です。
DB接続の情報は環境変数から取得できるのでそのまま自動実行できます。省略しないでください。

## 必須テスト項目

### 1. モックテスト（単体テスト）- 自動実施
```bash
cd server
npm test
```
- [ ] 全テストケースが成功すること
- [ ] テストカバレッジが十分であること
- [ ] エラーケースもテストされていること

### 2. 実DB接続テスト - 自動実施
```bash
cd server
node scripts/test-connection.js
```
- [ ] DB接続が成功すること
- [ ] 接続情報が正しく読み込まれていること
- [ ] エラーハンドリングが適切に動作すること

### 3. 実DB CRUD操作テスト - 自動実施
サーバーを起動して、全CRUD操作を実際に実行：
```bash
cd server
npm run dev &
SERVER_PID=$!
sleep 5

# POST: 新規作成
curl -X POST http://localhost:8000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Todo"}'

# GET: 全件取得
curl http://localhost:8000/api/todos

# PUT: 更新（IDは上記で取得したものを使用）
curl -X PUT http://localhost:8000/api/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"done":true}'

# DELETE: 削除
curl -X DELETE http://localhost:8000/api/todos/1

# GET: 削除確認
curl http://localhost:8000/api/todos

# サーバー停止
kill $SERVER_PID
```

- [ ] POST（作成）が成功すること
- [ ] GET（取得）が成功すること
- [ ] PUT（更新）が成功すること
- [ ] DELETE（削除）が成功すること
- [ ] Boolean値が正しく変換されていること
- [ ] エラーハンドリングが適切に動作すること

### 4. サーバー起動テスト - 自動実施
```bash
# 開発モード
cd server
npm run dev &
DEV_PID=$!
sleep 3
kill $DEV_PID

# 本番モード
npm start &
PROD_PID=$!
sleep 3
kill $PROD_PID
```

- [ ] `npm run dev` で起動成功
- [ ] `npm start` で起動成功
- [ ] テスト実行後の再起動も成功
- [ ] ポート競合なし

### 5. クリーンアップ確認 - 自動実施
テスト完了後、以下を確認：
```bash
# サーバープロセスの確認
ps aux | grep "node src/app.js" | grep -v grep
# → プロセスが存在しないこと

# ポート使用状況の確認
lsof -i :8000 || echo "✅ ポート8000は使用されていません"
# → ポートが解放されていること
```

- [ ] サーバープロセスが停止していること
- [ ] ポートが解放されていること
- [ ] テストデータがクリーンアップされていること

### 6. フロントエンドテスト（ブラウザ確認）- 手動確認推奨

**注意**: フロントエンドのブラウザテストは、Playwright/Cypress等のE2Eテストツールを使えば自動化可能ですが、
今回のプロジェクトでは以下の理由により**手動確認を推奨**します：

- E2Eテストツールの導入にはセットアップコストがかかる
- 簡単なTodoアプリなので手動確認で十分
- ビジュアルの確認（ローディング表示等）は人間の目で確認する方が確実

**手動確認手順**:
```bash
# サーバー起動
cd server
npm run dev

# 別ターミナルでクライアント起動
cd client
npm run dev
```

ブラウザで http://localhost:5173 にアクセスし、以下を確認：
- [ ] Todo追加が動作すること
- [ ] Todo一覧表示が動作すること
- [ ] Todo完了/未完了の切り替えが動作すること
- [ ] Todo削除が動作すること
- [ ] ローディング表示が適切に表示されること（⏳ 処理中、お待ちください...）
- [ ] ボタンのdisable制御が動作すること
- [ ] エラーメッセージが適切に表示されること

**自動化する場合**（オプション）:
Playwrightを使用した例：
```bash
# Playwrightインストール
npm install -D @playwright/test
npx playwright install

# テストファイル作成（client/e2e/todos.spec.js）
# テスト実行
npx playwright test
```

## テスト実施のチェックリスト

実装完了前に、以下の全てにチェックを入れること：

- [ ] モックテスト実施済み（全テスト成功）- **自動実施必須**
- [ ] 実DB接続テスト実施済み（接続成功）- **自動実施必須**
- [ ] 実DB CRUD操作テスト実施済み（全操作成功）- **自動実施必須**
- [ ] サーバー起動テスト実施済み（開発・本番両方）- **自動実施必須**
- [ ] クリーンアップ確認済み（プロセス停止、ポート解放）- **自動実施必須**
- [ ] フロントエンドテスト実施済み（ブラウザ確認）- **手動確認推奨**（自動化はオプション）
- [ ] テスト結果をドキュメント化済み（TEST_RESULTS.md等）- **必須**

**重要**:
- 1〜5の自動テストは**必ず全て実施**すること
- 6のフロントエンドテストは**手動確認を推奨**（時間があれば自動化）
- 全てのテスト結果をドキュメント化すること

# テスト実施の際の注意事項
- テストコードでモックを使用する場合、モックのメソッド名も実際の API に合わせること。モックが通っても実 DB では動かない場合がある。
- 実装後は必ず実 DB に接続してエンドツーエンドの動作確認を行うこと（テストのモックだけでは不十分）。
- 実装完了後は必ず以下の順序で確認すること：
  1. `npm test`（モックテスト）→ ロジックの正しさを確認
  2. 実 DB に接続してサーバーを起動し、全 CRUD 操作を手動確認 → API の正しさを確認
  3. テスト後にサーバーを起動して問題ないことを確認
- テストが成功し完了する場合はテストで起動したサーバー、クライアントは全て停止さぜ、テストでDBに作成したデータは削除すること
- テストの際の環境変数は.envから読まず、設定されている環境変数から読むこと(デモのため値を表示させないため)
- テストが失敗しても、そこでタスクを終わらせず、必ず次のアクションを提案し、どうするか確認すること。
- 全てのテストを自動化し、全てあなたが実施してださい。


# `ibm_db` コネクションオブジェクトの主要メソッド一覧（参考）

実装時に参照すること：

| メソッド | 説明 |
|---------|------|
| `conn.query(sql, params, cb)` | SQL 実行 |
| `conn.beginTransaction(cb)` | トランザクション開始（自動コミット無効化） |
| `conn.commitTransaction(cb)` | COMMIT |
| `conn.rollbackTransaction(cb)` | ROLLBACK |
| `conn.close(cb)` | コネクションをプールに返却 |
| `conn.prepare(sql, cb)` | プリペアドステートメント作成 |
| `conn.setIsolationLevel(level)` | 分離レベル設定 |

`ibm_db.Pool` の主要メソッド：

| メソッド | 説明 |
|---------|------|
| `pool.init(minSize, connStr)` | プール初期化（最小接続数を確保） |
| `pool.setMaxPoolSize(maxSize)` | 最大接続数を設定 |
| `pool.open(connStr, cb)` | プールからコネクション取得 |
| `pool.close(cb)` | プール全体をクローズ |

# 🚨 重要：過去の実装で発生した問題と対策

以下は実際の実装で発生した問題です。同じ間違いを避けるため、必ず確認してください。

## 問題1: `pool.init()` のコールバック問題

**❌ 間違った実装**:
```javascript
// pool.init() はコールバックを受け取らない
pool.init(MIN_CONNECTIONS, connStr, (err) => {
  // このコールバックは呼ばれない！
  console.log('初期化完了');
});
```

**✅ 正しい実装**:
```javascript
// pool.open() を使用して初期化を確認
export async function initializePool() {
  if (poolInitialized) return;
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Pool initialization timeout after 30 seconds'));
    }, 30000);
    
    pool.open(connStr, (err, conn) => {
      clearTimeout(timeout);
      if (err) {
        reject(err);
      } else {
        poolInitialized = true;
        conn.close(() => resolve());
      }
    });
  });
}
```

**理由**: `pool.init()` メソッドはコールバックパラメータを受け取らない仕様です。初期化確認には `pool.open()` を使用してください。

## 問題2: トップレベルでのプール初期化によるサーバー再起動ループ

**❌ 間違った実装**:
```javascript
// db.js のトップレベルで初期化
export const pool = new ibm_db.Pool();
pool.setMaxPoolSize(MAX_CONNECTIONS);
await pool.init(MIN_CONNECTIONS, connStr);  // ← これが原因で再起動ループ
```

**✅ 正しい実装**:
```javascript
// db.js - 初期化関数をエクスポート
export const pool = new ibm_db.Pool();
pool.setMaxPoolSize(MAX_CONNECTIONS);

export async function initializePool() {
  // 初期化ロジック
}

// app.js - サーバー起動時に明示的に初期化
import { initializePool } from './db.js';

initializePool()
  .then(() => {
    app.listen(PORT, () => console.log(`Server on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
```

**理由**: `--watch` モードでファイル変更を検知すると、トップレベルの `await` が再実行され、サーバーが連続再起動します。初期化は明示的な関数呼び出しで行ってください。

## 問題3: ESM環境でのJestモック

**❌ 間違った実装**:
```javascript
// CommonJS形式のモックはESMで動作しない
jest.mock('../src/db.js', () => ({
  executeQuery: jest.fn()
}));
```

**✅ 正しい実装**:
```javascript
import { jest } from '@jest/globals';

// jest.unstable_mockModule を使用
const executeQuery = jest.fn();
jest.unstable_mockModule('../src/db.js', () => ({
  executeQuery,
  DB2_SCHEMA: 'TESTSCHEMA',
  DB2_TABLE_TODOS: 'TODOS'
}));

// 動的インポート
const { default: todos } = await import('../src/routes/todos.js');
```

**理由**: ES Modules環境では `jest.mock()` が動作しません。`jest.unstable_mockModule()` と動的インポートを使用してください。

## 問題4: Db2のBOOLEAN型の扱い

**注意**: Db2のBOOLEAN型は `1` (true) または `0` (false) として返されます。

**✅ 正しい変換**:
```javascript
// クライアントに返す際は必ず変換
res.json({
  id: row.ID,
  title: row.TITLE,
  done: row.DONE === 1 || row.DONE === true  // 両方チェック
});
```

## 問題5: RETURNING句の非サポート

**❌ PostgreSQLの書き方**:
```sql
INSERT INTO todos (title, done) VALUES ($1, $2) RETURNING *;
```

**✅ Db2の書き方**:
```javascript
// INSERT実行
const insertSql = `INSERT INTO ${TABLE} (TITLE, DONE) VALUES (?, ?)`;
await executeQuery(insertSql, [title, false]);

// 別途SELECTで取得
const selectSql = `SELECT ID, TITLE, DONE FROM ${TABLE}
                   ORDER BY ID DESC
                   FETCH FIRST 1 ROW ONLY`;
const rows = await executeQuery(selectSql);
```

**理由**: Db2は `RETURNING` 句をサポートしていません。INSERT後に別途SELECTを実行してください。

## チェックリスト：実装前に必ず確認

- [ ] `pool.init()` にコールバックを渡していないか？
- [ ] プール初期化をトップレベルで `await` していないか？
- [ ] ESM環境で `jest.mock()` を使用していないか？
- [ ] Boolean値の変換処理を実装しているか？
- [ ] `RETURNING` 句を使用していないか？
- [ ] カラム名を大文字で扱っているか？
- [ ] スキーマ名を含めてテーブルを指定しているか？
- [ ] `conn.close()` を必ず呼び出しているか？
- [ ] エラーハンドリングを実装しているか？
- [ ] タイムアウト処理を実装しているか？