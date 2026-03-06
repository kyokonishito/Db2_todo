import { useEffect, useRef, useState } from 'react';
import './app.css';

const API = import.meta.env.VITE_API ?? 'http://localhost:8000/api';

export default function App() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // 編集モード用
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const editInputRef = useRef(null);

  const addHelpId = 'add-help-text';

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const r = await fetch(`${API}/todos`);
      if (!r.ok) throw new Error(`API error: ${r.status}`);
      const data = await r.json();
      setTodos(Array.isArray(data) ? data : []);
      if (!Array.isArray(data)) setError('Unexpected response (not array)');
    } catch (e) {
      console.error(e);
      setError('Network/API error');
      setTodos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

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

  async function toggle(id, done) {
    setLoading(true);
    try {
      await fetch(`${API}/todos/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ done: !done })
      });
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function remove(id) {
    setLoading(true);
    try {
      await fetch(`${API}/todos/${id}`, { method: 'DELETE' });
      await load();
    } finally {
      setLoading(false);
    }
  }

  function startEdit(todo) {
    setEditingId(todo.id);
    setEditingTitle(todo.title);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingTitle('');
  }

  async function saveEdit(id) {
    const next = editingTitle.trim();
    if (!next) { cancelEdit(); return; }
    setLoading(true);
    try {
      await fetch(`${API}/todos/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ title: next })
      });
      setEditingId(null);
      setEditingTitle('');
      await load();
    } finally {
      setLoading(false);
    }
  }

  function onEditKeyDown(e, id) {
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
  }

  return (
    <main className="container">
      <header className="header">
        <h1 className="title">Db2 TODO</h1>
        <p className="subtitle">Db2 / Express / React / Node.js 構成のToDo アプリケーション</p>
        <p className="subtitle">シンプルで軽快なToDo（アクセシビリティ対応）</p>
      </header>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="alert"
        >
          {error}
        </div>
      )}

      {loading && (
        <div className="loading-message" role="status" aria-live="polite">
          ⏳ 処理中、お待ちください...
        </div>
      )}

      {/* 追加フォーム */}
      <form onSubmit={addTodo} className="card add-form" aria-labelledby="add-heading">
        <h2 id="add-heading" className="sr-only">ToDoの追加</h2>
        <label htmlFor="new-todo-input" className="sr-only">新しいToDoを入力</label>
        <input
          id="new-todo-input"
          value={title}
          onChange={e=>setTitle(e.target.value)}
          placeholder="例）資料レビュー、デモ準備"
          aria-label="新しいToDo"
          aria-describedby={addHelpId}
          aria-invalid={false}
          className="input"
        />
        <span id={addHelpId} className="sr-only">
          ToDoの内容を入力してから追加ボタンを押してください
        </span>
        <button type="submit" className="btn primary" disabled={loading}>Add</button>
      </form>

      {/* 一覧 */}
      <section aria-labelledby="list-heading" className="list-section">
        <h2 id="list-heading" className="sr-only">ToDo一覧</h2>
        <ul role="list" className="list">
          {todos.map(t => {
            const isEditing = editingId === t.id;
            const editDescId = `edit-desc-${t.id}`;
            return (
              <li key={t.id} className="card list-item">
                <div className="item-main">
                  <label htmlFor={`chk-${t.id}`} className="checkbox-label">
                    <input
                      id={`chk-${t.id}`}
                      type="checkbox"
                      checked={t.done}
                      onChange={() => toggle(t.id, t.done)}
                      aria-label={`${t.title} を${t.done ? '未完に戻す' : '完了にする'}`}
                      className="checkbox"
                      disabled={loading}
                    />
                    {isEditing ? (
                      <>
                        <input
                          ref={editInputRef}
                          value={editingTitle}
                          onChange={e=>setEditingTitle(e.target.value)}
                          onKeyDown={(e)=>onEditKeyDown(e, t.id)}
                          aria-label={`「${t.title}」を編集`}
                          aria-describedby={editDescId}
                          className="input edit-input"
                        />
                        <span id={editDescId} className="sr-only">
                          Enter キーで保存、Esc キーでキャンセルします
                        </span>
                      </>
                    ) : (
                      <span className={`item-title ${t.done ? 'done' : ''}`}>
                        {t.title}
                      </span>
                    )}
                  </label>
                </div>

                <div className="item-actions">
                  {isEditing ? (
                    <>
                      <button onClick={() => saveEdit(t.id)} className="btn success" aria-label={`「${t.title}」の変更を保存`} disabled={loading}>Save</button>
                      <button onClick={cancelEdit} className="btn ghost" aria-label={`「${t.title}」の編集をキャンセル`} disabled={loading}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(t)} className="btn secondary" aria-label={`「${t.title}」を編集`} disabled={loading}>Edit</button>
                      <button onClick={() => remove(t.id)} className="btn danger" aria-label={`「${t.title}」を削除`} disabled={loading}>Delete</button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
