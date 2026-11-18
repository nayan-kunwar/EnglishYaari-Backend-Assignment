import * as sessionService from '../services/session.service';
import * as userService from '../services/user.service';
import { asyncHandler } from '../utils/asyncHandler';
import type { CreateUserInput } from '../validators/user.validator';

export const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body as CreateUserInput);

  res.status(201).json({ success: true, data: user });
});

export const getUserSessions = asyncHandler(async (req, res) => {
  const data = await sessionService.getUserSessions(req.params.id);

  res.status(200).json({ success: true, data });
});
