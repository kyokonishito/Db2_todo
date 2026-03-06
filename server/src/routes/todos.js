import { Router } from 'express';
import { executeQuery, DB2_SCHEMA, DB2_TABLE_TODOS } from '../db.js';

const router = Router();
const TABLE = `${DB2_SCHEMA}.${DB2_TABLE_TODOS}`;

// CREATE
router.post('/', async (req, res, next) => {
  try {
    const { title } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    // INSERT実行（LESSONS_LEARNED: Db2はRETURNINGをサポートしない）
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
    
    if (!rows || rows.length === 0) {
      throw new Error('Failed to retrieve inserted record');
    }
    
    // LESSONS_LEARNED: Boolean変換（Db2は1/0で返す）
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
    
    // LESSONS_LEARNED: Boolean変換
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
    
    if (title !== undefined && title !== null) {
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
    
    if (!rows || rows.length === 0) {
      return res.sendStatus(404);
    }
    
    // LESSONS_LEARNED: Boolean変換
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
    const id = req.params.id;
    
    // 削除前に存在確認
    const checkSql = `SELECT ID FROM ${TABLE} WHERE ID = ?`;
    const checkRows = await executeQuery(checkSql, [id]);
    
    if (!checkRows || checkRows.length === 0) {
      return res.sendStatus(404);
    }
    
    // 削除実行
    const deleteSql = `DELETE FROM ${TABLE} WHERE ID = ?`;
    await executeQuery(deleteSql, [id]);
    
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

export default router;

// Made with Bob
