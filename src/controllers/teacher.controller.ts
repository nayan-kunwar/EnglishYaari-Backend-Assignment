import * as teacherService from '../services/teacher.service';
import { asyncHandler } from '../utils/asyncHandler';
import type { CreateTeacherInput } from '../validators/teacher.validator';

export const createTeacher = asyncHandler(async (req, res) => {
  const teacher = await teacherService.createTeacher(
    req.body as CreateTeacherInput,
  );

  res.status(201).json({ success: true, data: teacher });
});

export const listTeachers = asyncHandler(async (_req, res) => {
  const teachers = await teacherService.listTeachers();

  res.status(200).json({ success: true, data: teachers });
});
