import { initializePool, executeQuery, DB2_SCHEMA, DB2_TABLE_TODOS } from '../src/db.js';

async function testConnection() {
  try {
    console.log('🔧 Testing Db2 connection...');
    console.log('');
    
    // プール初期化
    console.log('Step 1: Initializing connection pool...');
    await initializePool();
    console.log('✅ Pool initialized successfully');
    console.log('');
    
    // 簡単なクエリ実行
    console.log('Step 2: Executing test query...');
    const result = await executeQuery('SELECT 1 AS TEST FROM SYSIBM.SYSDUMMY1');
    console.log('✅ Query executed successfully:', result);
    console.log('');
    
    // テーブル存在確認
    console.log('Step 3: Checking table existence...');
    const TABLE = `${DB2_SCHEMA}.${DB2_TABLE_TODOS}`;
    try {
      const rows = await executeQuery(`SELECT COUNT(*) as CNT FROM ${TABLE}`);
      console.log(`✅ Table ${TABLE} exists`);
      console.log(`   Row count: ${rows[0].CNT}`);
    } catch (err) {
      console.log(`⚠️  Table ${TABLE} does not exist`);
      console.log('   Please run: node scripts/create-table.js');
    }
    console.log('');
    
    console.log('✅ All connection tests passed');
    process.exit(0);
  } catch (err) {
    console.error('');
    console.error('❌ Connection test failed:', err);
    console.error('');
    console.error('Please check:');
    console.error('  1. Db2 server is running');
    console.error('  2. Environment variables are set correctly');
    console.error('  3. Network connectivity to Db2 server');
    process.exit(1);
  }
}

testConnection();

// Made with Bob
