import { Router } from 'express';

import * as userController from '../controllers/user.controller';
import { validateBody } from '../middlewares/validate.middleware';
import { createUserSchema } from '../validators/user.validator';

const router = Router();

router.post('/', validateBody(createUserSchema), userController.createUser);
router.get('/:id/sessions', userController.getUserSessions);

export default router;
