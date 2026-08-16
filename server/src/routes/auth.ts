import { Router } from 'express';
import { authService } from '../services/authService';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../lib/response';

const router = Router();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    throw new Error('用户名和密码不能为空');
  }

  const user = await authService.login(username, password);
  const token = authService.generateJwt(user.id);

  res.json(successResponse({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
    },
  }));
}));

router.post('/register', asyncHandler(async (req, res) => {
  const { username, password, name } = req.body;
  if (!username || !password) {
    throw new Error('用户名和密码不能为空');
  }

  const user = await authService.register(username, password, name);
  const token = authService.generateJwt(user.id);

  res.status(201).json(successResponse({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
    },
  }));
}));

router.get('/wechat/config', asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: {
      appId: process.env.WECHAT_APP_ID,
      redirectUri: process.env.WECHAT_REDIRECT_URI,
    },
  });
}));

router.get('/wechat/callback', asyncHandler(async (req, res) => {
  const { code } = req.query;
  if (!code || typeof code !== 'string') {
    return res.redirect(`${CLIENT_URL}/login?error=missing_code`);
  }

  const user = await authService.exchangeCodeForUser(code);
  const token = authService.generateJwt(user.id);
  res.redirect(`${CLIENT_URL}/auth/callback?token=${token}`);
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json(successResponse(req.user));
}));

router.post('/logout', authenticate, asyncHandler(async (_req, res) => {
  res.json(successResponse(null));
}));

export default router;
