export interface HandleRequestDetail {
  target: EventTarget;
  identifier: string;
}

export interface OnRequestDetail extends HandleRequestDetail {
  type: string;
}

export interface AttrRequestDetail extends HandleRequestDetail {
  attribute: string;
}

export interface PropRequestDetail extends HandleRequestDetail {
  property: string;
}

export type BindableProperty = "checked" | "value";

export interface BindRequestDetail extends HandleRequestDetail {
  property: BindableProperty;
}

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

export type Destructor = () => void;
export type EffectCallback = () => Destructor | void;
export type EffectOptions = {
  signal: AbortSignal;
};
