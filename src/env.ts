import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    LOG_LEVEL: z.string().default('info'),
    GEMINI_API_KEY: z.string(),
  },
  runtimeEnv: process.env,
});
