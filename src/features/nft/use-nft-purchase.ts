import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { clampQuantity, isPurchasable, remainingPurchasable } from '@/domain/nft'
import { cartQuery, useAddToCart } from '@/features/cart/queries'
import { type NftDetailDto } from '@/shared/api/dtos/nft'
import { describeError } from '@/shared/components/feedback-states'
import { useCacheOwner } from '@/shared/session/cache-owner'

/**
 * Purchase state of the detail page: selected edition, quantity limited by stock,
 * per-order cap and what is already in the cart, plus add/buy actions.
 */
export function useNftPurchase(nft: NftDetailDto, editionId: string | undefined) {
  const navigate = useNavigate()
  const owner = useCacheOwner()
  const { data: cart } = useQuery(cartQuery(owner))
  const addToCart = useAddToCart()

  const edition =
    nft.editions.find((item) => item.id === editionId) ??
    nft.editions.find((item) => item.id === nft.defaultEditionId) ??
    nft.editions[0]
  if (!edition) throw new Error(`NFT ${nft.id} has no editions`)

  const inCart = cart?.items.find((item) => item.editionId === edition.id)?.quantity ?? 0
  const max = remainingPurchasable(edition, inCart)
  const [quantity, setQuantity] = useState(1)

  // Keep the quantity valid when the edition, stock (realtime) or cart change.
  useEffect(() => setQuantity((current) => clampQuantity(current, max) || 1), [max])

  const unavailableReason = !isPurchasable(edition)
    ? 'Esta edição está esgotada.'
    : max === 0
      ? `Você já tem o máximo permitido desta edição no carrinho (${inCart}).`
      : null

  const add = async (options: { goToCart: boolean }) => {
    if (unavailableReason) return
    try {
      await addToCart.mutateAsync({ nftId: nft.id, editionId: edition.id, quantity })
      if (options.goToCart) {
        await navigate({ to: '/cart' })
      } else {
        toast.success(`${nft.name} (${edition.label}) adicionado ao carrinho.`)
      }
    } catch (error) {
      toast.error(describeError(error))
    }
  }

  return {
    edition,
    quantity,
    setQuantity,
    max,
    inCart,
    unavailableReason,
    pending: addToCart.isPending,
    buyNow: () => add({ goToCart: true }),
    addToCart: () => add({ goToCart: false }),
  }
}

export type NftPurchase = ReturnType<typeof useNftPurchase>
