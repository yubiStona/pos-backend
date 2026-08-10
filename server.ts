import { createApp } from './src/app.js';
import { initializeDatabase } from './src/config/database.js';
import { seedDatabase } from './src/seeders/seed.ts';
import { ENV } from './src/config/env.js';

async function startServer() {
  try {
    console.log('Initializing Small-Mart POS System...');
    await initializeDatabase();
    await seedDatabase();

    const app = await createApp();
    const port = ENV.PORT || 3000;

    app.listen(port, '0.0.0.0', () => {
      console.log(`Small-Mart POS Server is live on http://0.0.0.0:${port}`);
    });
  } catch (error) {
    console.error('Failed to start Small-Mart POS server:', error);
    process.exit(1);
  }
}

startServer();
