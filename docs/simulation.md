# Simulation

The app has no server, so `src/services/simulation` plays everyone else: people go online and
offline, type, send messages, and receive and read yours.

## How it fits together

```
createChatSimulation ──▶ MockBackend ──▶ ChatApi.subscribe ──▶ connectChatEvents ──▶ Redux ──▶ UI
    (decides what           (updates the     (the same slot a      (turns events
     happens, and when)      mock's data)     WebSocket fills)      into actions)
```

The simulation knows nothing about React or Redux, and Redux knows nothing about the simulation.
`subscribe` is part of `ChatApi`, so a real backend pushes the same events and nothing above it
changes. The simulation writes through the mock backend, so live events and later requests agree.

| Event                    | Effect in Redux                                                   |
| ------------------------ | ----------------------------------------------------------------- |
| `message-received`       | Stored, the conversation updates, and an open chat is marked read |
| `message-status-changed` | Moves forward only, because late events are ignored               |
| `presence-changed`       | Updates online status and last seen                               |
| `typing-started`         | Shows the indicator, and starts a timer for `expiresAt`           |
| `typing-stopped`         | Clears the indicator and its timer                                |

## Behavior

- **Sending:** a message goes from sent to delivered to read, then the other person may type and reply.
- **Direct messages** wait at sent while the recipient is offline, and move on when they return.
- **Group messages** always move on. This is a shortcut: the mock does not track each recipient.
- **Group replies** come from an online member, half of the time.
- **Unprompted messages** arrive every 20 to 45 seconds from someone online.
- **Presence** changes for one person every 12 to 30 seconds. The current user never changes.

Timings are in `DEFAULT_TIMING`.

## Lifecycle and cleanup

The app subscribes in an effect in `App`, and that effect's cleanup disconnects. The first subscriber
starts the simulation and the last one stops it, so React's double mount in development is safe.

- Every simulation timer goes through `schedule`, so `stop` can clear all of them.
- `stop` also ends any typing in progress, so nobody stays typing on screen.
- `connectChatEvents` clears its typing timers when it disconnects.

## Testing it

Pass `random: createRandom(seed)` and a fixed `timing`, and use fake timers. The same seed gives the
same events in the same order.

```ts
const api = createSimulatedChatApi({ simulation: { random: createRandom(1) } })
```
