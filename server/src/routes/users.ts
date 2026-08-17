import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../lib/response';
import { userService } from '../services/userService';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  const users = await userService.list();
  res.json(successResponse(users));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const user = await userService.getById(req.params.id as string);
  res.json(successResponse(user));
}));

export default router;
