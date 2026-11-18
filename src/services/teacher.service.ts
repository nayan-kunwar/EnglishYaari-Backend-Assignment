import { Teacher } from '../models/teacher.model';
import { ApiError } from '../utils/ApiError';
import type { CreateTeacherInput } from '../validators/teacher.validator';

export const createTeacher = async (input: CreateTeacherInput) => {
  const email = input.email.toLowerCase();
  const existingTeacher = await Teacher.exists({ email });

  if (existingTeacher) {
    throw new ApiError(409, 'A teacher with this email already exists');
  }

  return Teacher.create({ ...input, email });
};

export const listTeachers = () =>
  Teacher.find().sort({ createdAt: -1 }).lean();
