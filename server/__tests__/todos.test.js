import { jest } from '@jest/globals';

// LESSONS_LEARNED: ESM環境ではjest.unstable_mockModule使用
const executeQuery = jest.fn();
jest.unstable_mockModule('../src/db.js', () => ({
  executeQuery,
  DB2_SCHEMA: 'TESTSCHEMA',
  DB2_TABLE_TODOS: 'TODOS'
}));

// 動的インポート
const { default: todosRouter } = await import('../src/routes/todos.js');

describe('Todos API Routes', () => {
  let req, res, next;

  beforeEach(() => {
    req = { 
      body: {}, 
      params: {},
      method: '',
      url: ''
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      sendStatus: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    executeQuery.mockClear();
    jest.clearAllMocks();
  });

  // ルーターからハンドラーを取得するヘルパー関数
  const getHandler = (method, path) => {
    const route = todosRouter.stack.find(layer => {
      if (!layer.route) return false;
      const routePath = layer.route.path;
      const routeMethod = Object.keys(layer.route.methods)[0].toUpperCase();
      return routePath === path && routeMethod === method;
    });
    return route ? route.route.stack[0].handle : null;
  };

  describe('POST /', () => {
    it('should create a new todo', async () => {
      const handler = getHandler('POST', '/');
      req.body = { title: 'Test Todo' };
      
      executeQuery
        .mockResolvedValueOnce([]) // INSERT
        .mockResolvedValueOnce([{ ID: 1, TITLE: 'Test Todo', DONE: 0 }]); // SELECT

      await handler(req, res, next);

      expect(executeQuery).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        id: 1,
        title: 'Test Todo',
        done: false
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 if title is missing', async () => {
      const handler = getHandler('POST', '/');
      req.body = { title: '' };

      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Title is required' });
      expect(executeQuery).not.toHaveBeenCalled();
    });

    it('should handle Boolean value true correctly', async () => {
      const handler = getHandler('POST', '/');
      req.body = { title: 'Test Todo' };
      
      executeQuery
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ ID: 1, TITLE: 'Test Todo', DONE: 1 }]); // DONE=1

      await handler(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        id: 1,
        title: 'Test Todo',
        done: true // 1 → true に変換
      });
    });

    it('should call next with error on database failure', async () => {
      const handler = getHandler('POST', '/');
      req.body = { title: 'Test Todo' };
      const dbError = new Error('Database error');
      
      executeQuery.mockRejectedValueOnce(dbError);

      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });

  describe('GET /', () => {
    it('should return all todos', async () => {
      const handler = getHandler('GET', '/');
      
      executeQuery.mockResolvedValueOnce([
        { ID: 1, TITLE: 'Todo 1', DONE: 0 },
        { ID: 2, TITLE: 'Todo 2', DONE: 1 }
      ]);

      await handler(req, res, next);

      expect(executeQuery).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith([
        { id: 1, title: 'Todo 1', done: false },
        { id: 2, title: 'Todo 2', done: true }
      ]);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return empty array when no todos', async () => {
      const handler = getHandler('GET', '/');
      
      executeQuery.mockResolvedValueOnce([]);

      await handler(req, res, next);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should call next with error on database failure', async () => {
      const handler = getHandler('GET', '/');
      const dbError = new Error('Database error');
      
      executeQuery.mockRejectedValueOnce(dbError);

      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });

  describe('PUT /:id', () => {
    it('should update todo title', async () => {
      const handler = getHandler('PUT', '/:id');
      req.params.id = '1';
      req.body = { title: 'Updated Title' };
      
      executeQuery
        .mockResolvedValueOnce([]) // UPDATE
        .mockResolvedValueOnce([{ ID: 1, TITLE: 'Updated Title', DONE: 0 }]); // SELECT

      await handler(req, res, next);

      expect(executeQuery).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith({
        id: 1,
        title: 'Updated Title',
        done: false
      });
    });

    it('should update todo done status', async () => {
      const handler = getHandler('PUT', '/:id');
      req.params.id = '1';
      req.body = { done: true };
      
      executeQuery
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ ID: 1, TITLE: 'Test Todo', DONE: 1 }]);

      await handler(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        id: 1,
        title: 'Test Todo',
        done: true
      });
    });

    it('should update both title and done', async () => {
      const handler = getHandler('PUT', '/:id');
      req.params.id = '1';
      req.body = { title: 'Updated', done: true };
      
      executeQuery
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ ID: 1, TITLE: 'Updated', DONE: 1 }]);

      await handler(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        id: 1,
        title: 'Updated',
        done: true
      });
    });

    it('should return 404 if todo not found', async () => {
      const handler = getHandler('PUT', '/:id');
      req.params.id = '999';
      req.body = { title: 'Updated' };
      
      executeQuery
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]); // 空の結果

      await handler(req, res, next);

      expect(res.sendStatus).toHaveBeenCalledWith(404);
    });

    it('should return 400 if no fields to update', async () => {
      const handler = getHandler('PUT', '/:id');
      req.params.id = '1';
      req.body = {};

      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No fields to update' });
    });
  });

  describe('DELETE /:id', () => {
    it('should delete a todo', async () => {
      const handler = getHandler('DELETE', '/:id');
      req.params.id = '1';
      
      executeQuery
        .mockResolvedValueOnce([{ ID: 1 }]) // 存在確認
        .mockResolvedValueOnce([]); // DELETE

      await handler(req, res, next);

      expect(executeQuery).toHaveBeenCalledTimes(2);
      expect(res.sendStatus).toHaveBeenCalledWith(204);
    });

    it('should return 404 if todo not found', async () => {
      const handler = getHandler('DELETE', '/:id');
      req.params.id = '999';
      
      executeQuery.mockResolvedValueOnce([]); // 存在しない

      await handler(req, res, next);

      expect(res.sendStatus).toHaveBeenCalledWith(404);
    });

    it('should call next with error on database failure', async () => {
      const handler = getHandler('DELETE', '/:id');
      req.params.id = '1';
      const dbError = new Error('Database error');
      
      executeQuery.mockRejectedValueOnce(dbError);

      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });
});

// Made with Bob
