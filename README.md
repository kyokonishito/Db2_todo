# Db2 TODO App

このリポジトリは、**Db2 / Express / React / Node.js 構成**のシンプルなToDo アプリケーションです。

PostgreSQLベースのアプリケーションからDb2に移行し、以下の特徴を持ちます：

- Db2固有の構文に対応（RETURNING句の代替実装など）
- `ibm_db`を用いた**生SQL**を明示的に扱う
- コネクションプール実装による安定した接続管理
- Boolean値の適切な変換処理

---

## 前提環境

このアプリケーションを実行するには、以下の環境が必要です。

### 必須
- **Node.js**: v18.x 以上（LTS推奨）
- **npm**: v9.x 以上（Node.jsに同梱）
- **Db2**: v12.1 以上

### 推奨
- **OS**: macOS / Linux / Windows（WSL2推奨）
- **ターミナル**: bash / zsh / PowerShell

### バージョン確認方法

```bash
# Node.js のバージョン確認
node --version

# npm のバージョン確認
npm --version

# Db2 のバージョン確認
db2level
```

---

## 同梱内容（構成）

```
db2_todo-demo-lite/
├─ server/                     # バックエンド（Node.js + Express）
│  ├─ src/
│  │  ├─ db.js                # Db2 接続（ibm_db Pool）
│  │  ├─ app.js               # Express エントリポイント
│  │  └─ routes/
│  │      └─ todos.js         # ToDo CRUD API（SQL直書き）
│  ├─ scripts/
│  │  ├─ create-table.js      # テーブル作成スクリプト
│  │  └─ test-connection.js   # DB接続テストスクリプト
│  ├─ __tests__/
│  │  └─ todos.test.js        # モックテスト
│  ├─ .env                    # 環境変数（要作成）
│  ├─ .env.example            # 環境変数サンプル
│  ├─ jest.config.js          # Jest設定
│  └─ package.json            # サーバ依存関係定義
│
└─ client/                    # フロントエンド（Vite + React）
   ├─ index.html
   ├─ src/
   │  ├─ main.jsx
   │  ├─ App.jsx              # ToDo UI / API 呼び出し
   │  └─ app.css              # スタイル（ローディング表示含む）
   ├─ .env                    # 環境変数（要作成）
   ├─ .env.example            # 環境変数サンプル
   └─ package.json            # クライアント依存関係定義
```

---

## サーバ側の特徴（server/）

### 技術スタック
- Node.js（LTS想定）
- Express 4.x
- ibm_db（Db2ドライバ）
- dotenv / cors

### 設計方針
- ORMは使用せず、**SQLをそのままコードに記述**
- Db2固有の構文に対応：
  - `?` プレースホルダ
  - `RETURNING` 句の代替実装（INSERT後にSELECT）
  - カラム名の大文字化（ID, TITLE, DONE）
  - Boolean値の変換（1/0 → true/false）
- コネクションプール実装による安定した接続管理

### 主なファイル

#### `src/db.js`
- `ibm_db.Pool` を使った Db2 接続管理
- `.env` または環境変数から接続情報を取得
- `initializePool()`: プール初期化関数
- `executeQuery()`: クエリ実行関数（タイムアウト・エラーハンドリング付き）

#### `src/routes/todos.js`
- ToDo の CRUD API を実装
- Db2固有の実装：
  - `INSERT` 後に `SELECT` で最新レコード取得
  - Boolean値の変換処理
  - スキーマ名を含むテーブル指定

#### `scripts/create-table.js`
- Db2テーブル作成スクリプト
- インデックス作成も含む

#### `scripts/test-connection.js`
- DB接続テストスクリプト
- プール初期化、クエリ実行、テーブル確認

---

## クライアント側の特徴（client/）

### 技術スタック
- Vite
- React 18

### 設計方針
- シンプルで使いやすいUI
- ローディング表示による操作フィードバック
- ボタンのdisable制御による誤操作防止

### 主な機能
- ToDo の作成 / 一覧 / 更新 / 削除
- ローディング表示（⏳ 処理中、お待ちください...）
- アクセシビリティ対応

---

## 使い方（セットアップ）

### 1. Db2 の初期化

Db2にログインし、以下を実行してください。

```sql
-- スキーマ作成（必要に応じて）
CREATE SCHEMA MYSCHEMA;

-- テーブル作成
CREATE TABLE MYSCHEMA.TODOS (
  ID INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
  TITLE VARCHAR(500) NOT NULL,
  DONE BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (ID)
);

-- インデックス作成
CREATE INDEX IDX_TODOS_DONE ON MYSCHEMA.TODOS(DONE);
```

または、スクリプトを使用：

```bash
cd server
node scripts/create-table.js
```

---

### 2. サーバ起動（Node.js + Express）

#### 環境変数の設定

```bash
cd server
cp .env.example .env   # 環境に合わせて編集
```

`.env` ファイルの内容例：

```env
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

# サーバーポート
PORT=8000
```

#### パッケージインストール

```bash
npm install
```

**注意**: `ibm_db` パッケージはネイティブモジュールのビルドが必要なため、インストールに数分かかる場合があります。

#### DB接続テスト

```bash
node scripts/test-connection.js
```

#### サーバー起動

```bash
# 開発モード（ファイル変更を監視）
npm run dev

# 本番モード
npm start
```

- 起動後、API は以下で待ち受けます。
  - http://localhost:8000
- 疎通確認：
  - http://localhost:8000/api/todos

---

### 3. クライアント起動（Vite + React）

#### 環境変数の設定

```bash
cd client
cp .env.example .env   # 必要に応じて編集
```

`.env` ファイルの内容例：

```env
# Vite 開発サーバーポート
VITE_PORT=5173

# API サーバー URL
VITE_API=http://localhost:8000/api
```

**注意**:
- `VITE_` プレフィックスが付いた環境変数のみがクライアントコードに公開されます
- ポート番号やAPI URLを変更する場合は、この `.env` ファイルを編集してください

#### クライアント起動

```bash
npm install
npm run dev
```

- ブラウザで以下にアクセス
  - http://localhost:5173

---

### 4. 動作確認ポイント

- ✅ ToDo の追加 / 完了チェック / 削除ができること
- ✅ ローディング表示が適切に表示されること
- ✅ ボタンがdisableされ、処理中の誤操作が防止されること
- ✅ サーバ側ログに SQL 実行エラーが出ていないこと

---

## テスト

### モックテスト（単体テスト）

```bash
cd server
npm test
```

### DB接続テスト

```bash
cd server
node scripts/test-connection.js
```

### CRUD操作テスト

サーバーを起動してから、以下のコマンドでテスト：

```bash
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
```

詳細なテスト結果は [TEST_RESULTS.md](TEST_RESULTS.md) を参照してください。

---

## Db2固有の実装ポイント

### 1. RETURNING句の代替実装

Db2は `RETURNING` 句をサポートしていないため、以下の方法で対応：

```javascript
// INSERT実行
await executeQuery(`INSERT INTO ${TABLE} (TITLE, DONE) VALUES (?, ?)`, [title, false]);

// 最新レコード取得
const rows = await executeQuery(`
  SELECT ID, TITLE, DONE 
  FROM ${TABLE}
  ORDER BY ID DESC
  FETCH FIRST 1 ROW ONLY
`);
```

### 2. Boolean値の変換

Db2はBOOLEAN型を `1` (true) または `0` (false) として返すため、必ず変換：

```javascript
const todo = {
  id: row.ID,
  title: row.TITLE,
  done: row.DONE === 1 || row.DONE === true
};
```

### 3. カラム名の大文字化

Db2のテーブルカラム名は大文字で扱われます：

```javascript
// ✅ 正しい
SELECT ID, TITLE, DONE FROM ...

// ❌ 間違い
SELECT id, title, done FROM ...
```

### 4. スキーマ名を含むテーブル指定

テーブル指定時は必ずスキーマ名を含めます：

```javascript
const TABLE = `${DB2_SCHEMA}.${DB2_TABLE_TODOS}`;
// 例: MYSCHEMA.TODOS
```

---

## トラブルシューティング

### ibm_dbのインストールに失敗する

**原因**: ネイティブモジュールのビルドに必要なツールが不足

**解決策**:
- macOS: `xcode-select --install`
- Linux: `sudo apt-get install build-essential`
- Windows: Visual Studio Build Tools をインストール

### DB接続に失敗する

**確認事項**:
1. Db2サーバーが起動しているか
2. 環境変数が正しく設定されているか
3. ネットワーク接続に問題がないか
4. ファイアウォールでポートがブロックされていないか

**デバッグ方法**:
```bash
cd server
node scripts/test-connection.js
```

### Boolean値が正しく表示されない

**原因**: Db2のBOOLEAN型は1/0で返される

**解決策**: 実装済みの変換処理を確認
- `server/src/routes/todos.js` の各エンドポイントで変換処理を実装済み

---

## 参考資料

- [ibm_db API Documentation](https://github.com/ibmdb/node-ibm_db/blob/master/APIDocumentation.md)
- [実装計画書](implement-plan.md)
- [テスト結果](TEST_RESULTS.md)
- [教訓ドキュメント](LESSONS_LEARNED.md)

---

## License

This project is licensed under the **Apache License 2.0**.

See the [LICENSE](LICENSE) file for details.