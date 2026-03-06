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

// プール初期化（MIN_CONNECTIONSは参考値として保持）
// LESSONS_LEARNED: pool.init()にコールバックを渡さない
pool.init(MIN_CONNECTIONS, connStr);

// プール初期化フラグ
let poolInitialized = false;

/**
 * プール初期化関数
 * LESSONS_LEARNED: pool.open()を使用して初期化確認
 */
export async function initializePool() {
  if (poolInitialized) {
    console.log('ℹ️  Pool already initialized');
    return;
  }
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Pool initialization timeout after 30 seconds'));
    }, 30000);
    
    // pool.open()を使用して初期化確認
    pool.open(connStr, (err, conn) => {
      clearTimeout(timeout);
      if (err) {
        console.error('❌ Failed to initialize pool:', err);
        reject(err);
      } else {
        poolInitialized = true;
        console.log('✅ Db2 connection pool initialized');
        console.log(`   Max connections: ${MAX_CONNECTIONS}`);
        console.log(`   Min connections: ${MIN_CONNECTIONS}`);
        conn.close(() => resolve());
      }
    });
  });
}

/**
 * クエリ実行関数
 * @param {string} sql - SQL文
 * @param {Array} params - パラメータ配列
 * @returns {Promise<Array>} - クエリ結果
 */
export async function executeQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Query execution timeout after 30 seconds'));
    }, 30000);

    pool.open(connStr, (err, conn) => {
      if (err) {
        clearTimeout(timeout);
        console.error('❌ Failed to get connection:', err);
        return reject(err);
      }

      conn.query(sql, params, (err, rows) => {
        clearTimeout(timeout);
        
        // LESSONS_LEARNED: 必ずコネクションをクローズ
        conn.close((closeErr) => {
          if (closeErr) {
            console.error('⚠️  Failed to close connection:', closeErr);
          }
        });

        if (err) {
          console.error('❌ Query execution error:', err);
          console.error('   SQL:', sql);
          console.error('   Params:', params);
          return reject(err);
        }

        resolve(rows);
      });
    });
  });
}

// Made with Bob
