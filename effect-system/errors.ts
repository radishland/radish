class BaseError extends Error {
  constructor(...params: ConstructorParameters<typeof Error>) {
    super(...params);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, UnhandledEffectError);
  }
}

/**
 * Error thrown when an effect has no handlers.
 *
 * @internal
 */
export class UnhandledEffectError extends BaseError {
  constructor(id: string) {
    super();
    this.message = `Unhandled effect "${id}". Add handlers to the HandlerScope`;
  }
}

/**
 * Error thrown when there is no terminal handler for a given effect
 *
 * @internal
 */
export class MissingTerminalHandlerError extends BaseError {
  constructor(id: string) {
    super();
    this.message =
      `All handlers for "${id}" returned Handler.continue. Make sure the handlers sequence contains a terminal handler`;
  }
}

/**
 * Error thrown when there is no HandlerScope to dynamically add handlers to or to perform effects in.
 *
 * @internal
 */
export class MissingHandlerScopeError extends Error {
  override message =
    "No HandlerScope. Make sure to perform effects in the context of a HandlerScope";
}

/**
 * Error thrown when an effect runner was created with {@linkcode createEffect}
 *
 * @internal
 */
export class IllFormedEffectError extends Error {
  override message =
    `Effect id not found while creating an effect handler. Use "createEffect"`;
}
