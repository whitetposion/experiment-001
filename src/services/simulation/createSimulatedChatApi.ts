import type { ChatEventListener } from '@/services/chatApi'
import {
  createMockChatApi,
  type MockChatApi,
  type MockChatApiOptions,
} from '@/services/mock-api/createMockChatApi'
import { createChatSimulation, type ChatSimulationOptions } from './createChatSimulation'

export interface SimulatedChatApiOptions extends MockChatApiOptions {
  simulation?: ChatSimulationOptions
}

/**
 * A mock backend with people on the other end. Like a socket, it runs while someone is
 * subscribed: the first subscriber starts the simulation and the last one stops it.
 */
export function createSimulatedChatApi({
  simulation: simulationOptions,
  ...mockOptions
}: SimulatedChatApiOptions = {}): MockChatApi {
  const api = createMockChatApi(mockOptions)
  const simulation = createChatSimulation(api.backend, simulationOptions)
  let subscriberCount = 0

  function subscribe(listener: ChatEventListener) {
    const unsubscribe = api.subscribe(listener)
    let isSubscribed = true

    subscriberCount += 1

    if (subscriberCount === 1) {
      simulation.start()
    }

    return () => {
      if (!isSubscribed) {
        return
      }

      isSubscribed = false
      subscriberCount -= 1

      // Stops first, so the final typing-stopped events still reach this listener.
      if (subscriberCount === 0) {
        simulation.stop()
      }

      unsubscribe()
    }
  }

  return { ...api, subscribe }
}
