import { createBus } from '@services/bus';
import type { BusEvents, TeacherFeed } from '@services/busEvents';
import type { PanelState } from '@ui/model/teacherPanel';
import { describe, expect, it } from 'vitest';
import { LEAVE_GRACE_MS, mountTeacherShell, type TeacherModule } from './teacherShell';

/** The few parts of a DOM element the shell touches; tests run without a DOM. */
interface FakeElement {
  hidden: boolean;
  className: string;
  readonly style: Record<string, string>;
  readonly children: FakeElement[];
  appendChild(child: FakeElement): FakeElement;
  readonly ownerDocument: { createElement(tag: string): FakeElement };
}

const fakeElement = (): FakeElement => {
  const element: FakeElement = {
    hidden: false,
    className: '',
    style: {},
    children: [],
    appendChild(child) {
      element.children.push(child);
      return child;
    },
    ownerDocument: { createElement: () => fakeElement() },
  };
  return element;
};

const feedOf = (level: string): TeacherFeed => ({ level, day: [], events: [[]], cursor: 0 });

/** Lets pending promise callbacks run. */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** A shell on a fake page whose panel records what it is asked to show; timers run by hand. */
function setUp(load?: () => Promise<TeacherModule>) {
  const bus = createBus<BusEvents>();
  const host = fakeElement();
  const shown: PanelState[] = [];
  const room: boolean[] = [];
  const timers: (() => void)[] = [];
  let loads = 0;
  bus.on('teacher.panel', ({ open }) => room.push(open));
  const shell = mountTeacherShell({
    bus,
    host: host as unknown as HTMLElement,
    load:
      load ??
      (() => {
        loads += 1;
        return Promise.resolve({
          mountTeacher: () => ({ show: (state: PanelState) => shown.push(state) }),
        });
      }),
    later: (run) => timers.push(run),
  });
  return {
    bus,
    shell,
    layer: host.children[0],
    shown,
    room,
    loads: () => loads,
    runTimers: () => timers.splice(0).forEach((run) => run()),
  };
}

describe("the light shell of the teacher's panel", () => {
  it('adds a hidden layer and loads nothing while the panel is folded', async () => {
    const { bus, layer, loads, room } = setUp();
    bus.emit('teacher.feed', feedOf('4.6'));
    await settle();
    expect(layer?.hidden).toBe(true);
    expect(loads()).toBe(0);
    expect(room).toEqual([]);
  });

  it('opened in a level, it makes room, loads the panel once and shows every feed', async () => {
    const { bus, layer, loads, room, shown } = setUp();
    bus.emit('teacher.feed', feedOf('4.6'));
    bus.emit('teacher.toggle');
    expect(layer?.hidden).toBe(false);
    expect(room).toEqual([true]);
    await settle();
    bus.emit('teacher.feed', feedOf('4.7'));
    expect(loads()).toBe(1);
    expect(shown.map((state) => state.feed?.level)).toEqual(['4.6', '4.7']);
    bus.emit('teacher.toggle');
    expect(layer?.hidden).toBe(true);
    expect(room).toEqual([true, false]);
  });

  it('jumping to another level keeps it open: a feed soon after leaving shows at once', async () => {
    const { bus, room, runTimers, layer } = setUp();
    bus.emit('teacher.feed', feedOf('4.6'));
    bus.emit('teacher.toggle');
    await settle();
    bus.emit('teacher.leave');
    bus.emit('teacher.feed', feedOf('4.7'));
    runTimers();
    expect(layer?.hidden).toBe(false);
    expect(room).toEqual([true]);
  });

  it('leaving for the hub hides it once the grace is over, and the next level shows it again', async () => {
    const { bus, room, runTimers, layer } = setUp();
    bus.emit('teacher.feed', feedOf('4.6'));
    bus.emit('teacher.toggle');
    await settle();
    bus.emit('teacher.leave');
    runTimers();
    expect(layer?.hidden).toBe(true);
    expect(room).toEqual([true, false]);
    bus.emit('teacher.feed', feedOf('4.7'));
    expect(room).toEqual([true, false, true]);
    expect(LEAVE_GRACE_MS).toBeGreaterThan(0);
  });

  it('a panel that fails to load folds again and is tried anew next time', async () => {
    const original = console.error;
    console.error = () => undefined;
    try {
      let attempts = 0;
      const { bus, room, layer } = setUp(() => {
        attempts += 1;
        return Promise.reject(new Error('offline'));
      });
      bus.emit('teacher.feed', feedOf('4.6'));
      bus.emit('teacher.toggle');
      await settle();
      expect(layer?.hidden).toBe(true);
      expect(room).toEqual([true, false]);
      bus.emit('teacher.toggle');
      await settle();
      expect(attempts).toBe(2);
    } finally {
      console.error = original;
    }
  });

  it('opened where it does not fit beside the canvas, it stays out of sight until it does', async () => {
    const { bus, layer, room, shell } = setUp();
    bus.emit('teacher.feed', feedOf('4.6'));
    bus.emit('teacher.toggle');
    // The game measured the window and found no room for it (a phone): it is not shown.
    shell.fit(false);
    expect(layer?.hidden).toBe(true);
    expect(room).toEqual([true]);
    bus.emit('teacher.feed', feedOf('4.7'));
    expect(layer?.hidden).toBe(true);
    // The window grew (the phone turned, a wider window): it shows where it was left.
    shell.fit(true);
    expect(layer?.hidden).toBe(false);
    await settle();
    // Folded, it stays folded whatever the room.
    bus.emit('teacher.toggle');
    shell.fit(true);
    expect(layer?.hidden).toBe(true);
  });
});
