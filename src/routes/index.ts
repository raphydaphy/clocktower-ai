import Router from '@koa/router';

const router = new Router();

router.get('/_health', async ctx => {
  ctx.status = 200;
  ctx.body = { status: 'ok' };
});

export { router };
