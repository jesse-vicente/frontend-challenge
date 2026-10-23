import { createRandom, type Random } from '../lib/random'
import {
  DEFAULT_BEHAVIOR,
  isScenarioName,
  type NetworkEffect,
  type NetworkRule,
  SCENARIOS,
  type ScenarioBehavior,
  type ScenarioDefinition,
  type ScenarioName,
} from './definitions'

const STORAGE_KEY = 'nft-mock:scenario'
const LATENCY_SEED = 42

interface RuntimeState {
  scenario: ScenarioDefinition
  random: Random
  /** Rules added at runtime (e.g. by tests via window.__mock.failNext). */
  extraRules: { rule: NetworkRule; remaining: number }[]
  /** Remaining uses of limited scenario rules, keyed by rule index. */
  ruleUses: Map<number, number>
  /** One-shot behaviors already consumed in this scenario run. */
  consumed: Set<string>
  latencyOverride: number | null
}

function readPersistedScenario(): ScenarioName {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isScenarioName(value) ? value : 'default'
  } catch {
    return 'default'
  }
}

function createState(name: ScenarioName): RuntimeState {
  return {
    scenario: SCENARIOS[name],
    random: createRandom(LATENCY_SEED),
    extraRules: [],
    ruleUses: new Map(),
    consumed: new Set(),
    latencyOverride: null,
  }
}

let state = createState('default')

export function initScenario(fromUrl: string | null): ScenarioName {
  const name = isScenarioName(fromUrl) ? fromUrl : readPersistedScenario()
  setScenario(name)
  return name
}

/** Activates a scenario and restarts its deterministic sequences. */
export function setScenario(name: ScenarioName): void {
  state = createState(name)
  try {
    localStorage.setItem(STORAGE_KEY, name)
  } catch {
    // Non-persistent storage: the scenario still applies to this page.
  }
}

export function getScenario(): ScenarioDefinition {
  return state.scenario
}

export function behavior(): ScenarioBehavior {
  return { ...DEFAULT_BEHAVIOR, ...state.scenario.behavior }
}

/** Returns true the first time it is called for a key within the scenario run. */
export function consumeOnce(key: string): boolean {
  if (state.consumed.has(key)) return false
  state.consumed.add(key)
  return true
}

export function setLatencyOverride(ms: number | null): void {
  state.latencyOverride = ms
}

export function addRule(rule: NetworkRule): void {
  state.extraRules.push({ rule, remaining: rule.times ?? Number.POSITIVE_INFINITY })
}

export function clearRules(): void {
  state.extraRules = []
}

export function nextLatency(): number {
  if (state.latencyOverride !== null) return state.latencyOverride
  const { min, max } = state.scenario.latency
  return min === max ? min : Math.round(min + state.random.next() * (max - min))
}

function matches(rule: NetworkRule, method: string, path: string): boolean {
  if (rule.method !== '*' && rule.method !== method) return false
  if (rule.path === '*') return true
  if (rule.path.endsWith('*')) return path.startsWith(rule.path.slice(0, -1))
  return rule.path === path
}

/** Finds the effect to apply to a request, consuming limited rules. */
export function matchEffect(method: string, path: string): NetworkEffect | null {
  for (const entry of state.extraRules) {
    if (entry.remaining > 0 && matches(entry.rule, method, path)) {
      entry.remaining -= 1
      return entry.rule.effect
    }
  }

  const rules = state.scenario.rules ?? []
  for (const [index, rule] of rules.entries()) {
    if (!matches(rule, method, path)) continue
    if (rule.times !== undefined) {
      const used = state.ruleUses.get(index) ?? 0
      if (used >= rule.times) continue
      state.ruleUses.set(index, used + 1)
    }
    return rule.effect
  }
  return null
}
