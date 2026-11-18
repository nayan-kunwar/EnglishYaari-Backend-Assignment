import { app } from './app';
import { connectDB, disconnectDB } from './config/db';
import { env } from './config/env';

const startServer = async (): Promise<void> => {
  await connectDB();

  const server = app.listen(env.port, () => {
    console.log(
      `Server listening on http://localhost:${env.port} (${env.nodeEnv})`,
    );
  });

  const shutdown = (signal: string): void => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    server.close(async (error) => {
      if (error) {
        console.error('Error while closing HTTP server:', error);
        process.exit(1);
      }

      await disconnectDB();
      console.log('Shutdown complete.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
