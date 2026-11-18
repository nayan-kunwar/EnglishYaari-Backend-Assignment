import mongoose from 'mongoose';

import { ApiError } from './ApiError';

/**
 * Rejects values such as 12-character strings that Mongoose could otherwise
 * cast to an ObjectId unintentionally.
 */
export const assertObjectId = (value: string, label: string): void => {
  if (!mongoose.isObjectIdOrHexString(value)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
};
