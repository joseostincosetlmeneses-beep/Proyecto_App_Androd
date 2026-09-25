import 'dotenv/config';
import { z } from 'zod';
const EnvSchema=z.object({PORT:z.coerce.number().default(3000),MONGODB_URI:z.string().min(1),JWT_SECRET:z.string().min(16)});
export const env=EnvSchema.parse(process.env);
