import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().default(8080),
    LOG_LEVEL: z.string().default('info'),
    PROJECT_ID: z.string(),
    GEMINI_API_KEY: z.string(),
  },
  runtimeEnv: process.env,
});
