import mongoose from 'mongoose';
import { z } from 'zod';

export const objectIdSchema = (field: string) =>
  z
    .string({ required_error: `${field} is required` })
    .refine(
      (value) => mongoose.isObjectIdOrHexString(value),
      `${field} must be a valid MongoDB ObjectId`,
    );
