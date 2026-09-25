import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
await connectDatabase();
createApp().listen(env.PORT,()=>console.log(`ERP API listening on ${env.PORT}`));
