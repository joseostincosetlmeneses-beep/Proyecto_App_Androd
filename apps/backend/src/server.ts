import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
await connectDatabase();
createApp().listen(env.PORT, '0.0.0.0', () => console.log(`ERP API listening on 0.0.0.0:${env.PORT}`));
