/** A listener of one event type, given that event's payload. */
export type Listener<Payload> = (payload: Payload) => void;

/**
 * The arguments `emit` takes after the event type: the payload, or nothing at all for an event whose
 * payload is `undefined` (an event that only says "it happened").
 */
type PayloadArgs<Payload> = undefined extends Payload ? [payload?: Payload] : [payload: Payload];

/**
 * A synchronous event emitter typed by an event map: each key is an event type and its value the
 * payload that event carries. The game and the DOM overlays talk through one of these, so neither
 * imports the other.
 */
export interface Bus<Events> {
  /** Adds a listener of `type`; returns the function that removes it again. */
  on<Type extends keyof Events>(type: Type, listener: Listener<Events[Type]>): () => void;
  /** Removes a listener of `type`; a listener that never subscribed is ignored. */
  off<Type extends keyof Events>(type: Type, listener: Listener<Events[Type]>): void;
  /** Delivers an event at once to every listener of its type, in the order they subscribed. */
  emit<Type extends keyof Events>(type: Type, ...args: PayloadArgs<Events[Type]>): void;
}

/**
 * Creates an empty bus. A listener that throws must not silence the others nor the one that emitted
 * (a broken book must never stop the garden): its error goes to `report`, the console by default,
 * and delivery goes on.
 */
export function createBus<Events>(
  report: (error: unknown) => void = (error) => console.error(error),
): Bus<Events> {
  // Listeners kept per type, untyped inside: `on` and `emit` are what tie each type to its payload.
  const listeners = new Map<keyof Events, Listener<never>[]>();

  const off = <Type extends keyof Events>(type: Type, listener: Listener<Events[Type]>): void => {
    const list = listeners.get(type);
    if (list === undefined) return;
    const index = list.indexOf(listener);
    if (index >= 0) list.splice(index, 1);
  };

  return {
    on(type, listener) {
      const list = listeners.get(type) ?? [];
      list.push(listener);
      listeners.set(type, list);
      return () => off(type, listener);
    },
    off,
    emit(type, ...args) {
      // A copy: a listener added or removed while this event is delivered changes the next one only.
      const list = [...(listeners.get(type) ?? [])] as Listener<unknown>[];
      for (const listener of list) {
        try {
          listener(args[0]);
        } catch (error) {
          report(error);
        }
      }
    },
  };
}
