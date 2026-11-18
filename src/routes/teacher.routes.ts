import { Router } from 'express';

import * as teacherController from '../controllers/teacher.controller';
import { validateBody } from '../middlewares/validate.middleware';
import { createTeacherSchema } from '../validators/teacher.validator';

const router = Router();

router.post(
  '/',
  validateBody(createTeacherSchema),
  teacherController.createTeacher,
);
router.get('/', teacherController.listTeachers);

export default router;
