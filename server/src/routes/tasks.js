import express from 'express';
import mongoose from 'mongoose';
import Task from '../models/Task.js';

const router = express.Router();
const allowedTaskFields = ['title', 'description', 'dueDate', 'category', 'completed'];

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

router.get('/', async (_req, res) => {
  try {
    const tasks = await Task.find().sort({ dueDate: 1, createdAt: -1 });
    res.status(200).json(tasks);
  } catch (error) {
    handleTaskError(error, res);
  }
});

router.post('/', async (req, res) => {
  try {
    const task = await Task.create(taskPayload(req.body));
    res.status(201).json(task);
  } catch (error) {
    handleTaskError(error, res);
  }
});

router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, taskPayload(req.body), {
      new: true,
      runValidators: true
    });

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
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.status(204).send();
  } catch (error) {
    return handleTaskError(error, res);
  }
});

export default router;
