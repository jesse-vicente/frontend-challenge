import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { diffQuotes } from '@/domain/quote'
import { quoteQuery } from '@/features/cart/queries'
import { useCreateOrder } from '@/features/orders/queries'
import { PROVIDER_LABELS, useConnectWallet } from '@/features/wallets/queries'
import { announce } from '@/shared/a11y/announcer'
import { type Network } from '@/shared/api/dtos/network'
import { type CreateOrderRequest, quoteStaleDetailsSchema } from '@/shared/api/dtos/order'
import { type QuoteDto } from '@/shared/api/dtos/quote'
import { type WalletProvider } from '@/shared/api/dtos/wallet'
import { hasErrorCode, isApiError } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/query-keys'
import { describeError } from '@/shared/components/feedback-states'
import { useCacheOwner } from '@/shared/session/cache-owner'
import { type ReviewState } from './components/review-dialog'

export type ConnectionState =
  | { status: 'idle' }
  | { status: 'connecting'; walletId: string; provider: WalletProvider }
  | { status: 'connected'; walletId: string; provider: WalletProvider }
  | { status: 'rejected'; walletId: string; provider: WalletProvider }

/**
 * Checkout state machine: connect wallet → review a fresh quote → send the
 * order. Any change between the reviewed quote and the server's view requires a
 * new confirmation; retries after timeouts reuse the same idempotency key.
 */
export function useCheckoutFlow() {
  const queryClient = useQueryClient()
  const owner = useCacheOwner()
  const navigate = useNavigate()
  const connectWallet = useConnectWallet()
  const createOrder = useCreateOrder()
  const [connection, setConnection] = useState<ConnectionState>({ status: 'idle' })
  const [review, setReview] = useState<ReviewState | null>(null)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [pendingPayload, setPendingPayload] = useState<Omit<CreateOrderRequest, 'quoteId'> | null>(null)

  const isConnected = (walletId: string, provider: WalletProvider) =>
    connection.status === 'connected' && connection.walletId === walletId && connection.provider === provider

  const connect = async (walletId: string, provider: WalletProvider): Promise<boolean> => {
    if (isConnected(walletId, provider)) return true
    setConnection({ status: 'connecting', walletId, provider })
    try {
      const result = await connectWallet.mutateAsync({ walletId, provider })
      if (result.status === 'connected') {
        setConnection({ status: 'connected', walletId, provider })
        announce(`${PROVIDER_LABELS[provider]} conectada.`)
        return true
      }
      setConnection({ status: 'rejected', walletId, provider })
      announce(`${PROVIDER_LABELS[provider]} recusou a conexão.`, 'assertive')
      return false
    } catch (error) {
      setConnection({ status: 'idle' })
      toast.error(describeError(error))
      return false
    }
  }

  const disconnect = () => {
    setConnection({ status: 'idle' })
    announce('Carteira desconectada.')
  }

  /** Step 1+2: connect, then open the review with a fresh quote for the chosen network. */
  const startReview = async (
    payload: Omit<CreateOrderRequest, 'quoteId'>,
    displayedQuote: QuoteDto | undefined,
  ): Promise<void> => {
    setOrderError(null)
    if (!(await connect(payload.walletId, payload.provider))) return
    try {
      const fresh = await queryClient.fetchQuery({ ...quoteQuery(owner, payload.network), staleTime: 0 })
      setPendingPayload(payload)
      setReview({ quote: fresh, changes: displayedQuote ? diffQuotes(displayedQuote, fresh) : [] })
    } catch (error) {
      toast.error(describeError(error))
    }
  }

  /** Step 3: send the order for the reviewed quote. */
  const confirm = async () => {
    if (!review || !pendingPayload || createOrder.isPending) return
    setOrderError(null)
    try {
      const order = await createOrder.mutateAsync({ ...pendingPayload, quoteId: review.quote.quoteId })
      setReview(null)
      await navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
    } catch (error) {
      if (hasErrorCode(error, 'QUOTE_STALE')) {
        const details = quoteStaleDetailsSchema.safeParse(error.details)
        if (details.success) {
          // The server saw new prices/stock: show them and ask for a new confirmation.
          queryClient.setQueryData(queryKeys.private.quote(owner, details.data.quote.network), details.data.quote)
          setReview({ quote: details.data.quote, changes: diffQuotes(review.quote, details.data.quote) })
          announce('Os valores do pedido mudaram. Revise e confirme novamente.', 'assertive')
          return
        }
      }
      if (isApiError(error) && (error.kind === 'timeout' || error.isTransient)) {
        setOrderError(
          'Não recebemos a confirmação do pedido. Tente novamente: se ele já foi criado, vamos recuperar o mesmo pedido.',
        )
        return
      }
      setOrderError(describeError(error))
    }
  }

  const closeReview = () => {
    setReview(null)
    setOrderError(null)
  }

  return {
    connection,
    connect,
    disconnect,
    review,
    startReview,
    confirm,
    closeReview,
    orderError,
    submitting: createOrder.isPending,
    reviewNetwork: (pendingPayload?.network ?? '') as Network | '',
  }
}
