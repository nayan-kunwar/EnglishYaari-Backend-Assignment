import mongoose from 'mongoose';

import { env } from './env';

export const connectDB = async (uri: string = env.mongodbUri): Promise<void> => {
  await mongoose.connect(uri);
  const { host, name } = mongoose.connection;
  console.log(`MongoDB connected: ${host}/${name}`);
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
};
