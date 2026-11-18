import { User } from '../models/user.model';
import { ApiError } from '../utils/ApiError';
import type { CreateUserInput } from '../validators/user.validator';

export const createUser = async (input: CreateUserInput) => {
  const email = input.email.toLowerCase();
  const existingUser = await User.exists({ email });

  if (existingUser) {
    throw new ApiError(409, 'A user with this email already exists');
  }

  return User.create({ ...input, email });
};
