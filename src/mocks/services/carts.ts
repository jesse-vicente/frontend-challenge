import { mergeLines } from '@/domain/cart'
import { type CartDto } from '@/shared/api/dtos/cart'
import { getDb, mutate, nextId } from '../db/store'
import { type CartRecord } from '../db/types'
import { MockHttpError } from '../http/respond'
import { findEdition, findNft } from './catalog'
import { type AuthContext } from './sessions'

const CLIENT_CART_ID = /^[\w-]{8,64}$/

function createCart(userId: string | null, id = nextId('cart')): CartRecord {
  const cart: CartRecord = {
    id,
    userId,
    items: [],
    couponCode: null,
    version: 0,
    updatedAt: new Date().toISOString(),
  }
  mutate((db) => {
    db.carts.push(cart)
  })
  return cart
}

/**
 * Resolves the cart of the caller: the user's cart when authenticated, otherwise
 * the guest cart named by X-Cart-Id (created on demand). A guest can never read
 * a cart that belongs to an account.
 */
export function resolveCart(request: Request, auth: AuthContext | null): CartRecord {
  const db = getDb()
  if (auth) {
    return db.carts.find((cart) => cart.userId === auth.user.id) ?? createCart(auth.user.id)
  }

  const cartId = request.headers.get('X-Cart-Id')
  if (cartId) {
    const cart = db.carts.find((item) => item.id === cartId)
    if (cart?.userId) throw new MockHttpError('FORBIDDEN', 'Este carrinho pertence a outra conta.')
    if (cart) return cart
    // Guests name their cart: it is created on first use with the client id.
    if (CLIENT_CART_ID.test(cartId)) return createCart(null, cartId)
  }
  return createCart(null)
}

export function touchCart(cartId: string, change: (cart: CartRecord) => void): CartRecord {
  return mutate((db) => {
    const cart = db.carts.find((item) => item.id === cartId)
    if (!cart) throw new MockHttpError('NOT_FOUND', 'Carrinho não encontrado.')
    change(cart)
    cart.version += 1
    cart.updatedAt = new Date().toISOString()
    return cart
  })
}

/** Enriches cart lines with live catalog data; lines whose NFT vanished are skipped. */
export function toCartDto(cart: CartRecord): CartDto {
  const items: CartDto['items'] = []
  for (const item of cart.items) {
    const nft = findNft(item.nftId)
    const edition = nft && findEdition(nft, item.editionId)
    if (!nft || !edition) continue
    items.push({
      id: item.id,
      nftId: item.nftId,
      editionId: item.editionId,
      quantity: item.quantity,
      unitPrice: edition.price,
      available: edition.available,
      maxPerOrder: edition.maxPerOrder,
      name: nft.name,
      editionLabel: edition.label,
      tokenId: nft.tokenId,
      creatorName: nft.creator.name,
      image: nft.image,
      addedAt: item.addedAt,
    })
  }
  return { id: cart.id, items, couponCode: cart.couponCode, version: cart.version, updatedAt: cart.updatedAt }
}

/** Moves a guest cart into the user's cart after login or sign up. */
export function mergeGuestCart(guestCartId: string | undefined, userId: string): void {
  if (!guestCartId) return
  const db = getDb()
  const guest = db.carts.find((cart) => cart.id === guestCartId && cart.userId === null)
  if (!guest || guest.items.length === 0) return

  const userCart = db.carts.find((cart) => cart.userId === userId) ?? createCart(userId)
  touchCart(userCart.id, (cart) => {
    // Item ids are globally unique, so guest lines keep theirs after the merge.
    cart.items = mergeLines(cart.items, guest.items, (line) => {
      const nft = findNft(line.nftId)
      return nft && findEdition(nft, line.editionId)
    })
    cart.couponCode ??= guest.couponCode
  })
  mutate((state) => {
    state.carts = state.carts.filter((cart) => cart.id !== guest.id)
  })
}
