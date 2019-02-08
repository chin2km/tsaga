import {
  Action,
  ActionCreator,
} from 'typescript-fsa';

export interface Task<T> {
  result: T;
  cancel: () => void;
}

export type WaitForAction = <Payload>(actionCreator: ActionCreator<Payload>) => Promise<Action<Payload>>;

export type FuncWithEnv<State, Args extends any[], T> = (env: SagaEnvironment<State>, ...args: Args) => T;

export abstract class BoundEffect<Env, Params extends any[], ReturnType> {
  public readonly args: Params;

  constructor(...args: Params) {
    this.args = args;
  }

  public abstract run(run: Env, ...args: Params): ReturnType;
}

export interface SagaEnvironment<State> {
  /**
   * Dispatch an action to the store from a saga.
   *
   * @param action - The action object.
   */
  dispatch(action: Action<any>): void;

  /**
   * Run a selector with the first argument being the current state.
   *
   * @param selector - The selector to call.
   * @param args - Additional arguments which will be passed to the selector after the state.
   */
  select<T, Args extends any[]>(
    selector: (state: State, ...args: Args) => T,
    ...args: Args
  ): T;

  /**
   * Call a function. This is only a wrapper for cancellation and mocking in tests.
   *
   * @param f - The function to execute.
   * @param params - The arguments for the function.
   */
  call<T, Args extends any[]>(f: (...params: Args) => T, ...params: Args): T;

  /**
   * Runs the given saga as an attached child.
   * Cancelling the parent will also cancel the child at the next opportunity.
   */
  run<Args extends any[], T>(
    effectOrEffectCreator: BoundEffect<SagaEnvironment<State>, Args, T> | FuncWithEnv<State, Args, T>,
    ...args: typeof effectOrEffectCreator extends BoundEffect<any, any, any> ? never : Args
  ): T;

  /**
   * Wait for an action to be dispatched.
   *
   * @param actionCreator - The action creator of the action to be dispatched.
   */
  take<Payload>(actionCreator: ActionCreator<Payload>): Promise<Payload>;

  /**
   * Spawns the saga in a new context, returning a detached task
   *
   * Cancelling this `Task` will not cancel the parent.
   */
  spawn<T, Args extends any[]>(
    effectOrEffectCreator: BoundEffect<SagaEnvironment<State>, Args, T> | FuncWithEnv<State, Args, T>,
    ...args: typeof effectOrEffectCreator extends BoundEffect<any, any, any> ? never : Args
  ): Task<T>;
}

export interface Saga<State, Payload> {
  actionCreator: ActionCreator<Payload>;
  innerFunction: (ctx: SagaEnvironment<State>, payload: Payload) => Promise<void>;
  type: 'every' | 'latest';
}

export type AnySaga = Saga<any, any>;
