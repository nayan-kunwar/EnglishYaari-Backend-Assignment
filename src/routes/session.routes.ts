import { Router } from 'express';

import * as sessionController from '../controllers/session.controller';
import { validateBody, validateQuery } from '../middlewares/validate.middleware';
import {
  availableSessionsQuerySchema,
  bookSessionSchema,
  createSessionSchema,
} from '../validators/session.validator';

const router = Router();

router.get(
  '/available',
  validateQuery(availableSessionsQuerySchema),
  sessionController.getAvailableSessions,
);
router.post(
  '/',
  validateBody(createSessionSchema),
  sessionController.createSession,
);
router.post(
  '/:id/book',
  validateBody(bookSessionSchema),
  sessionController.bookSession,
);
router.patch('/:id/complete', sessionController.completeSession);

export default router;
