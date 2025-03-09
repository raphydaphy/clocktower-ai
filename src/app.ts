import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import helmet from 'koa-helmet';
import morgan from 'koa-morgan';

import { env } from './env';
import { router } from './routes';

const app = new Koa({
  proxy: true,
});

app.use(
  bodyParser({
    jsonLimit: '10mb',
  })
);

if (env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

if (env.NODE_ENV === 'production') {
  app.use(helmet());
}

app.use(router.routes()).use(router.allowedMethods());

export { app };
