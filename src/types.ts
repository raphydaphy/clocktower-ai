import { DefaultContext, DefaultState, ParameterizedContext } from 'koa';

export type CustomContext<
  Params = unknown,
  Query = unknown,
  Body = unknown,
  State = DefaultState
> = ParameterizedContext<
  State,
  DefaultContext & {
    query: Query;
    request: {
      params: Params;
      body: Body;
    };
  }
>;

export interface ValidatedState<
  ValidatedParams = unknown,
  ValidatedQuery = unknown,
  ValidatedBody = unknown
> {
  validated: {
    params: ValidatedParams;
    query: ValidatedQuery;
    body: ValidatedBody;
  };
}
