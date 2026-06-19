import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';
import { signToken } from '../utils/jwt.js';

const router = express.Router();

function requireDatabase(_req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: 'Database is not connected. Check your MongoDB Atlas Network Access IP whitelist.'
    });
  }

  return next();
}

function handleAuthError(error, res) {
  if (error instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(error.errors).map((item) => item.message);
    return res.status(400).json({ message: messages.join(', ') });
  }

  if (error.code === 11000) {
    return res.status(409).json({ message: 'An account with that email already exists' });
  }

  console.error(error);
  return res.status(500).json({ message: 'Unexpected server error' });
}

router.post('/register', requireDatabase, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });

    if (existing) {
      return res.status(409).json({ message: 'An account with that email already exists' });
    }

    const user = await User.create({ name, email: normalizedEmail, password });
    const token = signToken(user._id);

    return res.status(201).json({ token, user: user.toSafeObject() });
  } catch (error) {
    return handleAuthError(error, res);
  }
});

router.post('/login', requireDatabase, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user._id);
    return res.status(200).json({ token, user: user.toSafeObject() });
  } catch (error) {
    return handleAuthError(error, res);
  }
});

router.get('/me', requireDatabase, verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ user: user.toSafeObject() });
  } catch (error) {
    return handleAuthError(error, res);
  }
});

router.put('/profile', requireDatabase, verifyToken, async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (typeof name === 'string' && name.trim()) {
      user.name = name.trim();
    }

    if (typeof req.body.avatar !== 'undefined') {
      // Accept a base64 data URL or null (to remove)
      user.avatar = req.body.avatar || null;
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to set a new password' });
      }

      const isMatch = await user.comparePassword(currentPassword);

      if (!isMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      user.password = newPassword;
    }

    await user.save();
    return res.status(200).json({ user: user.toSafeObject() });
  } catch (error) {
    return handleAuthError(error, res);
  }
});

export default router;