import express from 'express';
import mongoose from 'mongoose';
import Task from '../models/Task.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
const allowedTaskFields = ['title', 'description', 'dueDate', 'category', 'completed'];

function requireDatabase(_req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: 'Database is not connected. Check your MongoDB Atlas Network Access IP whitelist.'
    });
  }

  return next();
}

function taskPayload(body) {
  return allowedTaskFields.reduce((payload, field) => {
    if (Object.hasOwn(body, field)) {
      payload[field] = body[field];
    }

    return payload;
  }, {});
}

function handleTaskError(error, res) {
  if (error instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(error.errors).map((item) => item.message);
    return res.status(400).json({ message: messages.join(', ') });
  }

  if (error instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: 'Invalid task id' });
  }

  console.error(error);
  return res.status(500).json({ message: 'Unexpected server error' });
}

// Every route below requires a valid JWT, and every query is scoped to req.user.id
// so a user can only ever see, edit, or delete their own tasks.
router.use(requireDatabase, verifyToken);

router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id }).sort({ dueDate: 1, createdAt: -1 });
    res.status(200).json(tasks);
  } catch (error) {
    handleTaskError(error, res);
  }
});

router.post('/', async (req, res) => {
  try {
    const task = await Task.create({ ...taskPayload(req.body), userId: req.user.id });
    res.status(201).json(task);
  } catch (error) {
    handleTaskError(error, res);
  }
});

router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      taskPayload(req.body),
      {
        new: true,
        runValidators: true
      }
    );

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.status(200).json(task);
  } catch (error) {
    return handleTaskError(error, res);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.id });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.status(204).send();
  } catch (error) {
    return handleTaskError(error, res);
  }
});

export default router;