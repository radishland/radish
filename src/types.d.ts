export type Maybe<T> = T | undefined;
export type MaybePromise<T> = T | Promise<T>;

export type OnRequestDetail = {
  type: string;
  handler: string;
};

export type UseRequestDetail = {
  hook: string;
};

export type AttrRequestDetail = {
  attribute: string;
  identifier: string;
};

export type PropRequestDetail = {
  property: string;
  identifier: string;
};

export type TextRequestDetail = {
  identifier: string;
};

export type HTMLRequestDetail = {
  identifier: string;
};

export type ClassRequestDetail = {
  identifier: string;
};

type BindableProperty = "checked" | "value";

export type BindRequestDetail = {
  property: BindableProperty;
  identifier: string;
  handled: boolean;
};

export interface AutonomousCustomElement {
  /**
   * A static getter
   */
  readonly observedAttributes?: string[] | undefined;
  /**
   * A static getter
   */
  readonly disabledFeatures?: ("internals" | "shadow")[] | undefined;
  /**
   * A static getter
   */
  readonly formAssociated?: boolean | undefined;

  connectedCallback?(): void;
  disconnectedCallback?(): void;
  adoptedCallback?(): void;

  attributeChangedCallback?(
    name: string,
    previous: string,
    next: string,
  ): void;

  formAssociatedCallback?(): void;
  formResetCallback?(): void;
  formDisabledCallback?(): void;
  formStateRestoreCallback?(): void;
}

export type ReactivityOptions = { deep: boolean };
export type Destructor = () => void;
export type EffectCallback = () => Destructor | void;
export type EffectOptions = {
  signal: AbortSignal;
};

export type Transform = (
  options: { path: string; content: string },
) => MaybePromise<string>;
