const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Task = require('./models/Task');
const authRoutes = require('./routes/auth');
const authenticateToken = require('./middleware/auth');
const validateTask = require('./middleware/validateTask');
const { cache, getCache, invalidateUserTasks, stats } = require('./utils/cache');
const taskEvents = require('./events');

// Register background handlers once before accepting requests.
require('./listeners');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  }),
);

app.use(authRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/debug/cache', authenticateToken, (req, res) => {
  res.json({ ...stats, keys: cache.keys().length, ttlSeconds: 60 });
});

app.get('/tasks', authenticateToken, async (req, res, next) => {
  try {
    const key = `tasks:list:${req.user.id}`;
    const result = getCache(key);
    if (result.hit) return res.set('X-Cache', 'HIT').json(result.value);

    const tasks = await Task.find({ user: req.user.id }).sort({ createdAt: -1 }).lean();
    cache.set(key, tasks);
    res.set('X-Cache', 'MISS').json(tasks);
  } catch (error) {
    next(error);
  }
});

app.get('/tasks/:id', authenticateToken, async (req, res, next) => {
  try {
    const key = `tasks:item:${req.user.id}:${req.params.id}`;
    const result = getCache(key);
    if (result.hit) return res.set('X-Cache', 'HIT').json(result.value);

    const task = await Task.findOne({ _id: req.params.id, user: req.user.id }).lean();

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    cache.set(key, task);
    res.set('X-Cache', 'MISS').json(task);
  } catch (error) {
    next(error);
  }
});

app.post('/tasks', authenticateToken, validateTask, async (req, res, next) => {
  try {
    const task = await Task.create({
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority,
      user: req.user.id,
    });
    invalidateUserTasks(req.user.id);
    console.log(`[API] Task creation response sent at ${new Date().toISOString()}`);
    res.status(201).json(task);
    taskEvents.emit('task-created', {
      task: task.toObject(),
      assignedUser: req.user.email || req.user.id,
    });
  } catch (error) {
    next(error);
  }
});

app.put('/tasks/:id', authenticateToken, validateTask, async (req, res, next) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      {
        title: req.body.title,
        description: req.body.description,
        priority: req.body.priority,
      },
      { new: true, runValidators: true },
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    invalidateUserTasks(req.user.id, req.params.id);
    res.json(task);
  } catch (error) {
    next(error);
  }
});

app.delete('/tasks/:id', authenticateToken, async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user.id });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    invalidateUserTasks(req.user.id, req.params.id);
    console.log(`[API] Task deletion response sent at ${new Date().toISOString()}`);
    res.json({
      success: true,
      message: 'Task deleted successfully',
    });
    taskEvents.emit('task-deleted', {
      task: task.toObject(),
      assignedUser: req.user.email || req.user.id,
    });
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: Object.values(err.errors).map((entry) => ({
        field: entry.path,
        message: entry.message,
      })),
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid task id',
    });
  }

  console.error(err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
