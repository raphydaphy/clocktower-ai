import 'dotenv/config';
import { app } from './app';
import { env } from './env';
import { log } from './services';

app.listen(env.PORT, () => {
  log.info(`API running on port ${env.PORT}`);
});
