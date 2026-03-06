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
    console.log('✅ Table verification - Row count:', rows.length);

    console.log('\n✅ Table creation completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create table:', err);
    process.exit(1);
  }
}

createTable();

// Made with Bob
