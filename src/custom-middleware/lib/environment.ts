import {Store} from 'redux';
import {CancellationToken} from './CancellationToken';
import {SagaCancelledError} from './SagaCancelledError';
import {Action} from './types';

export class Environment<StateT, ActionT extends Action> {
  constructor(
    private readonly store: Store<StateT, ActionT>,
    private readonly cancellationToken?: CancellationToken
  ) {
    // Manually binding this is still needed, as TS doesn't accept overloads otherwise
    (this as any).run = this.run.bind(this);
  }

  public dispatch = (action: ActionT): void => {
    if (this.cancellationToken && this.cancellationToken.canceled) {
      throw new SagaCancelledError(`Saga has been cancelled`);
    }

    this.store.dispatch(action);
  }

  public createDetachedChildEnvironment(): {
    childEnv: Environment<StateT, ActionT>;
    cancellationToken: CancellationToken;
  } {
    if (this.cancellationToken && this.cancellationToken.canceled) {
      throw new SagaCancelledError(`Saga has been cancelled`);
    }

    // this is used for forks, to it shouldn't be cancelled when the parent is cancelled
    const cancellationToken = new CancellationToken();
    const childEnv = new Environment(this.store, cancellationToken);

    return {childEnv, cancellationToken};
  }

  public select = <T, P extends any[]>(
    selector: (state: StateT, ...p1: P) => T,
    ...args: P
  ): T => {
    if (this.cancellationToken && this.cancellationToken.canceled) {
      throw new SagaCancelledError(`Saga has been cancelled`);
    }

    return selector(this.store.getState(), ...args);
  }

  public run<T, P extends any[]>(f: (...params: P) => T, ...params: P): T;
  public run<T>(effect: Effect<T, this>): T;
  public run<T>(first: Function | Effect<T, this>, ...rest: any[]): T {
    if (typeof first === 'function') {
      return first(...rest);
    }

    return first.run(this);
  }
}

export interface Effect<T, Env> {
  run: (env: Env) => T;
}

export interface Task<T> {
  result: T;
  cancel: () => void;
}
