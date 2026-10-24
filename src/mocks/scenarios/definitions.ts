import { type ApiErrorCode } from '@/shared/api/dtos/error'

export type NetworkEffect =
  | { readonly type: 'network-error' }
  | { readonly type: 'timeout' }
  | { readonly type: 'http-error'; readonly status: number; readonly code: ApiErrorCode; readonly message: string }

export interface NetworkRule {
  /** HTTP method or '*' for any. */
  readonly method: string
  /** Path relative to the API base; a trailing '*' matches any suffix. */
  readonly path: string
  readonly effect: NetworkEffect
  /** How many matching requests the rule affects; unlimited when omitted. */
  readonly times?: number
}

export interface ScenarioBehavior {
  readonly emptyCatalog: boolean
  readonly sessionTtlMs: number
  readonly paymentOutcome: 'confirmed' | 'declined'
  readonly settlementDelayMs: number
  /** Mutation applied to the catalog right when the first order is submitted. */
  readonly changeOnOrder: 'price' | 'sold-out' | null
  /** Holds the first order response beyond the client timeout (order is still created). */
  readonly firstOrderResponseDelayMs: number | null
  readonly walletConnection: 'approve' | 'reject'
}

export interface ScenarioDefinition {
  readonly name: ScenarioName
  readonly label: string
  readonly description: string
  readonly latency: { readonly min: number; readonly max: number }
  readonly rules?: readonly NetworkRule[]
  readonly behavior?: Partial<ScenarioBehavior>
}

export const DEFAULT_BEHAVIOR: ScenarioBehavior = {
  emptyCatalog: false,
  sessionTtlMs: 2 * 60 * 60 * 1000,
  paymentOutcome: 'confirmed',
  settlementDelayMs: 2500,
  changeOnOrder: null,
  firstOrderResponseDelayMs: null,
  walletConnection: 'approve',
}

const transient = (path: string, method = 'GET'): NetworkRule => ({
  method,
  path,
  effect: { type: 'http-error', status: 503, code: 'TRANSIENT', message: 'Serviço temporariamente indisponível.' },
})

export const SCENARIO_NAMES = [
  'default',
  'empty',
  'slow',
  'variable-latency',
  'offline',
  'server-error',
  'favorites-failure',
  'session-expired',
  'unauthorized',
  'price-change-during-checkout',
  'edition-sold-out',
  'order-timeout',
  'payment-declined',
  'wallet-rejected',
] as const
export type ScenarioName = (typeof SCENARIO_NAMES)[number]

export const SCENARIOS: Record<ScenarioName, ScenarioDefinition> = {
  default: {
    name: 'default',
    label: 'Padrão',
    description: 'Tudo funciona, com latência curta e pagamento confirmado.',
    latency: { min: 150, max: 350 },
  },
  empty: {
    name: 'empty',
    label: 'Catálogo vazio',
    description: 'A busca de NFTs não retorna resultados.',
    latency: { min: 150, max: 350 },
    behavior: { emptyCatalog: true },
  },
  slow: {
    name: 'slow',
    label: 'Rede lenta',
    description: 'Todas as respostas levam cerca de 2,5 s.',
    latency: { min: 2500, max: 2500 },
  },
  'variable-latency': {
    name: 'variable-latency',
    label: 'Latência variável',
    description: 'Latência entre 100 ms e 2 s, gerando respostas fora de ordem (sequência reproduzível).',
    latency: { min: 100, max: 2000 },
  },
  offline: {
    name: 'offline',
    label: 'Sem conexão',
    description: 'Toda requisição falha por indisponibilidade de rede.',
    latency: { min: 50, max: 50 },
    rules: [{ method: '*', path: '*', effect: { type: 'network-error' } }],
  },
  'server-error': {
    name: 'server-error',
    label: 'Erro no servidor',
    description: 'Catálogo e detalhe respondem 503 até o cenário ser trocado.',
    latency: { min: 150, max: 350 },
    rules: [transient('/nfts*')],
  },
  'favorites-failure': {
    name: 'favorites-failure',
    label: 'Falha nos favoritos',
    description: 'Adicionar ou remover favoritos falha (rollback da atualização otimista).',
    latency: { min: 300, max: 300 },
    rules: [transient('/me/favorites/*', 'PUT'), transient('/me/favorites/*', 'DELETE')],
  },
  'session-expired': {
    name: 'session-expired',
    label: 'Sessão curta',
    description: 'Sessões expiram 45 s após o login.',
    latency: { min: 150, max: 350 },
    behavior: { sessionTtlMs: 45_000 },
  },
  unauthorized: {
    name: 'unauthorized',
    label: 'Acesso negado',
    description: 'Recursos privados respondem 403.',
    latency: { min: 150, max: 350 },
    rules: [
      {
        method: '*',
        path: '/me*',
        effect: { type: 'http-error', status: 403, code: 'FORBIDDEN', message: 'Acesso não autorizado.' },
      },
    ],
  },
  'price-change-during-checkout': {
    name: 'price-change-during-checkout',
    label: 'Preço alterado na compra',
    description: 'O preço de um item sobe 10% no envio do pedido; a cotação precisa ser reconfirmada.',
    latency: { min: 150, max: 350 },
    behavior: { changeOnOrder: 'price' },
  },
  'edition-sold-out': {
    name: 'edition-sold-out',
    label: 'Edição esgotada na compra',
    description: 'Uma edição do carrinho esgota no envio do pedido.',
    latency: { min: 150, max: 350 },
    behavior: { changeOnOrder: 'sold-out' },
  },
  'order-timeout': {
    name: 'order-timeout',
    label: 'Timeout no pedido',
    description: 'O primeiro envio cria o pedido mas a resposta excede o timeout; o reenvio recupera o mesmo pedido.',
    latency: { min: 150, max: 350 },
    behavior: { firstOrderResponseDelayMs: 20_000 },
  },
  'payment-declined': {
    name: 'payment-declined',
    label: 'Pagamento recusado',
    description: 'Pedidos são recusados pela carteira após o processamento.',
    latency: { min: 150, max: 350 },
    behavior: { paymentOutcome: 'declined' },
  },
  'wallet-rejected': {
    name: 'wallet-rejected',
    label: 'Conexão recusada',
    description: 'A carteira recusa a solicitação de conexão.',
    latency: { min: 150, max: 350 },
    behavior: { walletConnection: 'reject' },
  },
}

export function isScenarioName(value: unknown): value is ScenarioName {
  return typeof value === 'string' && (SCENARIO_NAMES as readonly string[]).includes(value)
}
