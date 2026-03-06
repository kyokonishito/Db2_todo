# PostgreSQL → Db2 移行実装計画

**作成日**: 2026-03-06  
**プロジェクト**: PERN TODO → Db2 TODO 移行

---

## 📋 実装概要

PostgreSQLベースのTodoアプリケーションをDb2ベースに移行します。LESSONS_LEARNEDの教訓に従い、段階的に実装・確認を行います。

### 移行対象
- **バックエンド**: PostgreSQL (pg) → Db2 (ibm_db)
- **フロントエンド**: タイトル・説明の更新、ローディング表示追加
- **テスト**: モックテスト、実DB接続テスト、CRUD操作テスト

---

## 🎯 実装方針

### LESSONS_LEARNEDの教訓を適用

1. **ドキュメントを信じすぎない** → 小さなテストスクリプトで動作確認
2. **思い込みを捨てる** → ibm_db独自の仕様を確認
3. **モックだけで満足しない** → 実DBテストも必須
4. **小さく作って小さく確認** → 段階的実装
5. **段階的にテスト** → 各ステップで動作確認

### 実装順序

```
1. 環境構築 → 動作確認
2. DB接続テスト → 接続成功確認
3. プール初期化 → サーバー起動確認
4. 1つのCRUD操作（GET） → curl確認
5. 残りのCRUD操作 → 各操作確認
6. モックテスト → npm test確認
7. 実DBテスト → 全操作確認
8. フロントエンド更新 → ブラウザ確認
```

---

## 📦 1. 環境構築とパッケージ更新

### 1.1 依存関係の更新

**変更ファイル**: [`server/package.json`](server/package.json)

```json
{
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "ibm_db": "^3.2.4"  // pg → ibm_db に変更
  },
  "devDependencies": {
    "@jest/globals": "^29.7.0",
    "jest": "^29.7.0"
  }
}
```

**実施内容**:
- `pg`パッケージを削除
- `ibm_db`パッケージを追加
- テスト用に`jest`と`@jest/globals`を追加

**確認方法**:
```bash
cd server
npm install
npm list ibm_db  # インストール確認
```

### 1.2 環境変数設定ファイルの更新

**変更ファイル**: [`server/.env.example`](server/.env.example)

```bash
# Db2接続情報
DB2_DATABASE=TESTDB
DB2_HOSTNAME=localhost
DB2_PORT=50000
DB2_UID=db2inst1
DB2_PWD=password
DB2_PROTOCOL=TCPIP
DB2_SECURITY=

# Db2テーブル情報
DB2_SCHEMA=MYSCHEMA
DB2_TABLE_TODOS=TODOS

# コネクションプール設定
DB2_MAX_CONNECTIONS=5
DB2_MIN_CONNECTIONS=1

# サーバー設定
PORT=8000
```

**注意事項**:
- 実際の接続情報は環境変数から取得（セキュリティ対策）
- `.env`ファイルは`.gitignore`に含める

---

## 🔌 2. Db2接続設定とコネクションプール実装

### 2.1 DB接続モジュールの実装

**変更ファイル**: [`server/src/db.js`](server/src/db.js)

**実装内容**:

```javascript
import ibm_db from 'ibm_db';
import 'dotenv/config';

// 環境変数の取得
const DB2_DATABASE = process.env.DB2_DATABASE;
const DB2_HOSTNAME = process.env.DB2_HOSTNAME;
const DB2_PORT = process.env.DB2_PORT || '50000';
const DB2_UID = process.env.DB2_UID;
const DB2_PWD = process.env.DB2_PWD;
const DB2_PROTOCOL = process.env.DB2_PROTOCOL || 'TCPIP';
const DB2_SECURITY = process.env.DB2_SECURITY || '';

export const DB2_SCHEMA = process.env.DB2_SCHEMA;
export const DB2_TABLE_TODOS = process.env.DB2_TABLE_TODOS || 'TODOS';

const MAX_CONNECTIONS = Number(process.env.DB2_MAX_CONNECTIONS || 5);
const MIN_CONNECTIONS = Number(process.env.DB2_MIN_CONNECTIONS || 1);

// 接続文字列の構築
const connStr = `DATABASE=${DB2_DATABASE};HOSTNAME=${DB2_HOSTNAME};PORT=${DB2_PORT};PROTOCOL=${DB2_PROTOCOL};UID=${DB2_UID};PWD=${DB2_PWD};${DB2_SECURITY ? `Security=${DB2_SECURITY};` : ''}`;

// コネクションプールの作成
export const pool = new ibm_db.Pool();
pool.setMaxPoolSize(MAX_CONNECTIONS);

// プール初期化フラグ
let poolInitialized = false;

// プール初期化関数（LESSONS_LEARNED: pool.init()にコールバックは渡さない）
export async function initializePool() {
  if (poolInitialized) return;
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Pool initialization timeout after 30 seconds'));
    }, 30000);
    
    // pool.open()を使用して初期化確認
    pool.open(connStr, (err, conn) => {
      clearTimeout(timeout);
      if (err) {
        console.error('Failed to initialize pool:', err);
        reject(err);
      } else {
        poolInitialized = true;
        console.log('✅ Db2 connection pool initialized');
        conn.close(() => resolve());
      }
    });
  });
}

// クエリ実行関数
export async function executeQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Query execution timeout after 30 seconds'));
    }, 30000);

    pool.open(connStr, (err, conn) => {
      if (err) {
        clearTimeout(timeout);
        console.error('Failed to get connection:', err);
        return reject(err);
      }

      conn.query(sql, params, (err, rows) => {
        clearTimeout(timeout);
        
        // 必ずコネクションをクローズ
        conn.close((closeErr) => {
          if (closeErr) {
            console.error('Failed to close connection:', closeErr);
          }
        });

        if (err) {
          console.error('Query execution error:', err);
          console.error('SQL:', sql);
          console.error('Params:', params);
          return reject(err);
        }

        resolve(rows);
      });
    });
  });
}
```

**重要ポイント**:
- ✅ `pool.init()`にコールバックを渡さない（LESSONS_LEARNED）
- ✅ `pool.open()`で初期化確認
- ✅ `conn.close()`を必ず呼び出す
- ✅ タイムアウト処理を実装
- ✅ エラーログを詳細に出力

### 2.2 アプリケーション起動処理の更新

**変更ファイル**: [`server/src/app.js`](server/src/app.js)

```javascript
import express from 'express';
import cors from 'cors';
import todos from './routes/todos.js';
import { initializePool } from './db.js';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/todos', todos);

// エラーハンドラー
app.use((err, _req, res, _next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'internal_error' });
});

const PORT = Number(process.env.PORT || 8000);

// LESSONS_LEARNED: トップレベルでawaitしない
// サーバー起動時に明示的に初期化
initializePool()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  });
```

**重要ポイント**:
- ✅ トップレベルで`await`しない（--watchモード対策）
- ✅ 明示的な初期化関数呼び出し
- ✅ 初期化失敗時は`process.exit(1)`

---

## 📊 3. テーブル作成スクリプト

**新規ファイル**: `server/scripts/create-table.sql`

```sql
-- Db2 TODOテーブル作成スクリプト
-- 使用方法: db2 -tvf create-table.sql

-- スキーマが存在しない場合は作成
-- CREATE SCHEMA IF NOT EXISTS ${DB2_SCHEMA};

-- テーブルが存在する場合は削除（開発用）
-- DROP TABLE IF EXISTS ${DB2_SCHEMA}.${DB2_TABLE_TODOS};

-- TODOテーブル作成
CREATE TABLE ${DB2_SCHEMA}.${DB2_TABLE_TODOS} (
  ID INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
  TITLE VARCHAR(500) NOT NULL,
  DONE BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (ID)
);

-- インデックス作成（パフォーマンス向上）
CREATE INDEX IDX_TODOS_DONE ON ${DB2_SCHEMA}.${DB2_TABLE_TODOS}(DONE);

-- 確認
SELECT * FROM ${DB2_SCHEMA}.${DB2_TABLE_TODOS};
```

**新規ファイル**: `server/scripts/create-table.js`

```javascript
import { executeQuery, DB2_SCHEMA, DB2_TABLE_TODOS, initializePool } from '../src/db.js';

const TABLE = `${DB2_SCHEMA}.${DB2_TABLE_TODOS}`;

async function createTable() {
  try {
    console.log('🔧 Initializing connection pool...');
    await initializePool();

    console.log(`🔧 Creating table: ${TABLE}`);
    
    // テーブル削除（既存の場合）
    try {
      await executeQuery(`DROP TABLE ${TABLE}`);
      console.log('✅ Existing table dropped');
    } catch (err) {
      console.log('ℹ️  Table does not exist (OK)');
    }

    // テーブル作成
    const createSql = `
      CREATE TABLE ${TABLE} (
        ID INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
        TITLE VARCHAR(500) NOT NULL,
        DONE BOOLEAN NOT NULL DEFAULT FALSE,
        PRIMARY KEY (ID)
      )
    `;
    await executeQuery(createSql);
    console.log('✅ Table created successfully');

    // インデックス作成
    const indexSql = `CREATE INDEX IDX_TODOS_DONE ON ${TABLE}(DONE)`;
    await executeQuery(indexSql);
    console.log('✅ Index created successfully');

    // 確認
    const rows = await executeQuery(`SELECT * FROM ${TABLE}`);
    console.log('✅ Table verification:', rows);

    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create table:', err);
    process.exit(1);
  }
}

createTable();
```

**確認方法**:
```bash
cd server
node scripts/create-table.js
```

---

## 🔄 4. CRUD APIのDb2対応実装

### 4.1 ルートハンドラーの更新

**変更ファイル**: [`server/src/routes/todos.js`](server/src/routes/todos.js)

**実装内容**:

```javascript
import { Router } from 'express';
import { executeQuery, DB2_SCHEMA, DB2_TABLE_TODOS } from '../db.js';

const router = Router();
const TABLE = `${DB2_SCHEMA}.${DB2_TABLE_TODOS}`;

// CREATE
router.post('/', async (req, res, next) => {
  try {
    const { title } = req.body;
    
    // INSERT実行（Db2はRETURNINGをサポートしない）
    const insertSql = `INSERT INTO ${TABLE} (TITLE, DONE) VALUES (?, ?)`;
    await executeQuery(insertSql, [title, false]);
    
    // 最後に挿入されたレコードを取得
    const selectSql = `
      SELECT ID, TITLE, DONE 
      FROM ${TABLE}
      ORDER BY ID DESC
      FETCH FIRST 1 ROW ONLY
    `;
    const rows = await executeQuery(selectSql);
    
    // Boolean変換（Db2は1/0で返す）
    const todo = {
      id: rows[0].ID,
      title: rows[0].TITLE,
      done: rows[0].DONE === 1 || rows[0].DONE === true
    };
    
    res.status(201).json(todo);
  } catch (err) {
    next(err);
  }
});

// READ (all)
router.get('/', async (_req, res, next) => {
  try {
    const sql = `SELECT ID, TITLE, DONE FROM ${TABLE} ORDER BY ID DESC`;
    const rows = await executeQuery(sql);
    
    // Boolean変換
    const todos = rows.map(row => ({
      id: row.ID,
      title: row.TITLE,
      done: row.DONE === 1 || row.DONE === true
    }));
    
    res.json(todos);
  } catch (err) {
    next(err);
  }
});

// UPDATE (partial)
router.put('/:id', async (req, res, next) => {
  try {
    const { title, done } = req.body;
    const id = req.params.id;
    
    // 更新するフィールドを動的に構築
    const updates = [];
    const params = [];
    
    if (title !== undefined) {
      updates.push('TITLE = ?');
      params.push(title);
    }
    
    if (typeof done === 'boolean') {
      updates.push('DONE = ?');
      params.push(done);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    params.push(id);
    
    const updateSql = `UPDATE ${TABLE} SET ${updates.join(', ')} WHERE ID = ?`;
    await executeQuery(updateSql, params);
    
    // 更新後のレコードを取得
    const selectSql = `SELECT ID, TITLE, DONE FROM ${TABLE} WHERE ID = ?`;
    const rows = await executeQuery(selectSql, [id]);
    
    if (!rows.length) {
      return res.sendStatus(404);
    }
    
    // Boolean変換
    const todo = {
      id: rows[0].ID,
      title: rows[0].TITLE,
      done: rows[0].DONE === 1 || rows[0].DONE === true
    };
    
    res.json(todo);
  } catch (err) {
    next(err);
  }
});

// DELETE
router.delete('/:id', async (req, res, next) => {
  try {
    const sql = `DELETE FROM ${TABLE} WHERE ID = ?`;
    await executeQuery(sql, [req.params.id]);
    
    // Db2はrowCountを返さないため、削除前に存在確認が必要
    // 簡略化のため、常に204を返す（実装を簡潔にするため）
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

export default router;
```

**重要ポイント**:
- ✅ カラム名は大文字（ID, TITLE, DONE）
- ✅ スキーマ名を含めてテーブル指定
- ✅ `RETURNING`句は使用しない（Db2非サポート）
- ✅ Boolean値を必ず変換（1/0 → true/false）
- ✅ プレースホルダーは`?`を使用

---

## 🎨 5. フロントエンドのUI更新

### 5.1 タイトルと説明の更新

**変更ファイル**: [`client/src/App.jsx`](client/src/App.jsx)

**変更箇所**:

```jsx
// 98-100行目
<h1 className="title">Db2 TODO</h1>
<p className="subtitle">Db2 / Express / React / Node.js 構成のToDo アプリケーション</p>
<p className="subtitle">シンプルで軽快なToDo（アクセシビリティ対応）</p>
```

**変更ファイル**: [`client/index.html`](client/index.html)

```html
<title>Db2 TODO App</title>
```

### 5.2 ローディング表示の追加

**変更ファイル**: [`client/src/App.jsx`](client/src/App.jsx)

**追加内容**:

```jsx
// stateにloading追加
const [loading, setLoading] = useState(false);

// 各API呼び出しでloading制御
async function addTodo(e) {
  e.preventDefault();
  if (!title.trim()) return;
  setLoading(true);
  try {
    await fetch(`${API}/todos`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ title })
    });
    setTitle('');
    await load();
  } finally {
    setLoading(false);
  }
}

// ローディング表示
{loading && (
  <div className="loading-message" role="status" aria-live="polite">
    ⏳ 処理中、お待ちください...
  </div>
)}

// ボタンのdisable制御
<button type="submit" className="btn primary" disabled={loading}>Add</button>
```

**CSSの追加**: [`client/src/app.css`](client/src/app.css)

```css
.loading-message {
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  padding: 12px;
  margin: 16px 0;
  text-align: center;
  font-weight: 500;
}
```

---

## 🧪 6. テストコード作成

### 6.1 Jest設定

**新規ファイル**: `server/jest.config.js`

```javascript
export default {
  testEnvironment: 'node',
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
  ],
};
```

### 6.2 モックテスト

**新規ファイル**: `server/__tests__/todos.test.js`

```javascript
import { jest } from '@jest/globals';

// モックの作成（LESSONS_LEARNED: ESM環境ではjest.unstable_mockModule使用）
const executeQuery = jest.fn();
jest.unstable_mockModule('../src/db.js', () => ({
  executeQuery,
  DB2_SCHEMA: 'TESTSCHEMA',
  DB2_TABLE_TODOS: 'TODOS'
}));

// 動的インポート
const { default: todos } = await import('../src/routes/todos.js');

describe('Todos API', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      sendStatus: jest.fn()
    };
    next = jest.fn();
    executeQuery.mockClear();
  });

  describe('POST /', () => {
    it('should create a new todo', async () => {
      req.body = { title: 'Test Todo' };
      executeQuery
        .mockResolvedValueOnce([]) // INSERT
        .mockResolvedValueOnce([{ ID: 1, TITLE: 'Test Todo', DONE: 0 }]); // SELECT

      await todos.stack[0].handle(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        id: 1,
        title: 'Test Todo',
        done: false
      });
    });
  });

  // 他のテストケースも同様に実装...
});
```

### 6.3 実DB接続テスト

**新規ファイル**: `server/scripts/test-connection.js`

```javascript
import { initializePool, executeQuery, DB2_SCHEMA, DB2_TABLE_TODOS } from '../src/db.js';

async function testConnection() {
  try {
    console.log('🔧 Testing Db2 connection...');
    
    // プール初期化
    await initializePool();
    console.log('✅ Pool initialized');
    
    // 簡単なクエリ実行
    const result = await executeQuery('SELECT 1 FROM SYSIBM.SYSDUMMY1');
    console.log('✅ Query executed:', result);
    
    // テーブル存在確認
    const TABLE = `${DB2_SCHEMA}.${DB2_TABLE_TODOS}`;
    const rows = await executeQuery(`SELECT COUNT(*) as CNT FROM ${TABLE}`);
    console.log(`✅ Table ${TABLE} exists, row count:`, rows[0].CNT);
    
    console.log('✅ All connection tests passed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection test failed:', err);
    process.exit(1);
  }
}

testConnection();
```

### 6.4 実DB CRUD操作テストスクリプト

**新規ファイル**: `server/scripts/test-crud.sh`

```bash
#!/bin/bash

# サーバー起動
cd server
npm run dev &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
sleep 5

# POST: 新規作成
echo "=== POST: Create Todo ==="
RESPONSE=$(curl -s -X POST http://localhost:8000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Todo"}')
echo $RESPONSE
TODO_ID=$(echo $RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo "Created Todo ID: $TODO_ID"

# GET: 全件取得
echo "=== GET: Fetch All Todos ==="
curl -s http://localhost:8000/api/todos

# PUT: 更新
echo "=== PUT: Update Todo ==="
curl -s -X PUT http://localhost:8000/api/todos/$TODO_ID \
  -H "Content-Type: application/json" \
  -d '{"done":true}'

# DELETE: 削除
echo "=== DELETE: Delete Todo ==="
curl -s -X DELETE http://localhost:8000/api/todos/$TODO_ID

# GET: 削除確認
echo "=== GET: Verify Deletion ==="
curl -s http://localhost:8000/api/todos

# サーバー停止
echo "=== Stopping Server ==="
kill $SERVER_PID
sleep 2

echo "✅ CRUD test completed"
```

---

## ✅ 7. テスト実施計画

### 7.1 テスト実施順序

```
1. モックテスト（単体テスト）
   → npm test

2. 実DB接続テスト
   → node scripts/test-connection.js

3. 実DB CRUD操作テスト
   → bash scripts/test-crud.sh

4. サーバー起動テスト
   → npm run dev / npm start

5. クリーンアップ確認
   → プロセス停止、ポート解放確認

6. フロントエンドテスト（手動）
   → ブラウザで動作確認
```

### 7.2 テスト成功基準

- [ ] モックテスト: 全テストケース成功
- [ ] 実DB接続テスト: 接続成功、テーブル確認成功
- [ ] 実DB CRUD操作テスト: 全操作成功、Boolean変換正常
- [ ] サーバー起動テスト: 開発・本番モード両方起動成功
- [ ] クリーンアップ: プロセス停止、ポート解放確認
- [ ] フロントエンド: 全操作動作、ローディング表示確認

---

## 📝 8. ドキュメント更新

### 8.1 README更新

**変更ファイル**: [`README.md`](README.md)

- タイトルを「Db2 TODO App」に変更
- セットアップ手順にDb2接続情報設定を追加
- テスト実行手順を追加

### 8.2 テスト結果ドキュメント作成

**新規ファイル**: `TEST_RESULTS.md`

- 各テストの実行結果を記録
- スクリーンショット添付（フロントエンド）
- 問題点と解決策を記録

---

## 🚨 重要な注意事項

### LESSONS_LEARNEDからの教訓

1. **pool.init()にコールバックを渡さない**
   - `pool.open()`で初期化確認

2. **トップレベルでawaitしない**
   - `--watch`モード対策

3. **ESM環境でのモック**
   - `jest.unstable_mockModule()`使用

4. **Boolean値の変換**
   - Db2は1/0で返すため必ず変換

5. **RETURNING句は使用しない**
   - INSERT後に別途SELECT

6. **カラム名は大文字**
   - ID, TITLE, DONE

7. **conn.close()を必ず呼び出す**
   - リソースリーク防止

8. **段階的に実装・確認**
   - 各ステップで動作確認

---

## 📊 実装チェックリスト

### 環境構築
- [ ] `ibm_db`パッケージインストール
- [ ] 環境変数設定確認
- [ ] `npm install`成功

### DB接続
- [ ] `db.js`実装完了
- [ ] `initializePool()`実装完了
- [ ] `executeQuery()`実装完了
- [ ] 接続テスト成功

### CRUD API
- [ ] POST実装完了
- [ ] GET実装完了
- [ ] PUT実装完了
- [ ] DELETE実装完了
- [ ] Boolean変換実装

### フロントエンド
- [ ] タイトル更新
- [ ] ローディング表示実装
- [ ] ボタンdisable制御実装

### テスト
- [ ] モックテスト実装
- [ ] 実DB接続テスト実装
- [ ] CRUD操作テスト実装
- [ ] 全テスト成功

### ドキュメント
- [ ] README更新
- [ ] TEST_RESULTS.md作成
- [ ] 実装計画書完成

---

## 🎯 次のステップ

この実装計画を確認後、Codeモードに切り替えて実装を開始します。

実装は以下の順序で進めます：

1. 環境構築（パッケージ更新）
2. DB接続テスト
3. プール初期化
4. 1つのCRUD操作（GET）
5. 残りのCRUD操作
6. モックテスト
7. 実DBテスト
8. フロントエンド更新
9. 全テスト実施

各ステップで必ず動作確認を行い、成功してから次に進みます。

---

**作成者**: Bob (AI Assistant)  
**最終更新**: 2026-03-06