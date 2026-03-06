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
  console.error('❌ Error:', err);
  res.status(500).json({ error: 'internal_error' });
});

const PORT = Number(process.env.PORT || 8000);

// LESSONS_LEARNED: トップレベルでawaitしない（--watchモード対策）
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

// Made with Bob
