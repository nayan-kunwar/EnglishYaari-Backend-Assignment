import * as sessionService from '../services/session.service';
import { asyncHandler } from '../utils/asyncHandler';
import type {
  AvailableSessionsQuery,
  BookSessionInput,
  CreateSessionInput,
} from '../validators/session.validator';

export const createSession = asyncHandler(async (req, res) => {
  const session = await sessionService.createSession(
    req.body as CreateSessionInput,
  );

  res.status(201).json({ success: true, data: session });
});

export const getAvailableSessions = asyncHandler(async (_req, res) => {
  const { dateTimestamp } = res.locals.query as AvailableSessionsQuery;
  const sessions = await sessionService.getAvailableSessions(dateTimestamp);

  res.status(200).json({ success: true, data: sessions });
});

export const bookSession = asyncHandler(async (req, res) => {
  const { userId } = req.body as BookSessionInput;
  const session = await sessionService.bookSession(req.params.id, userId);

  res.status(200).json({ success: true, data: session });
});

export const completeSession = asyncHandler(async (req, res) => {
  const session = await sessionService.completeSession(req.params.id);

  res.status(200).json({ success: true, data: session });
});
