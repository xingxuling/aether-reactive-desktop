import { EventBus } from "./eventBus";

describe("event bus", () => {
  it("publishes and unsubscribes listeners", () => {
    const bus = new EventBus<number>();
    const received: number[] = [];
    const unsubscribe = bus.subscribe((value) => received.push(value));
    bus.publish(1);
    unsubscribe();
    bus.publish(2);
    expect(received).toEqual([1]);
  });
});
