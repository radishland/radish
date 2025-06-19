import type { HandlerRegistry } from "./handler-registry.ts";

export type TypedEvent<T extends EventTarget, Detail> = CustomEvent<Detail> & {
  target: T;
};

type HandlerRegistryEvent<D> = TypedEvent<HandlerRegistry, D>;

export interface HandleDirectiveEventDetail {
  target: EventTarget;
  identifier: string;
  key: string;
}

export type HandleDirectiveEvent = HandlerRegistryEvent<
  HandleDirectiveEventDetail
>;

declare global {
  interface GlobalEventHandlersEventMap {
    "rad::attr": HandleDirectiveEvent;
    "rad::bind": HandleDirectiveEvent;
    "rad::bool": HandleDirectiveEvent;
    "rad::classlist": HandleDirectiveEvent;
    "rad::html": HandleDirectiveEvent;
    "rad::on": HandleDirectiveEvent;
    "rad::prop": HandleDirectiveEvent;
    "rad::text": HandleDirectiveEvent;
    "rad::use": HandleDirectiveEvent;
  }
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
