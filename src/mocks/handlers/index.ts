import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { favoriteHandlers } from './favorites'
import { nftHandlers } from './nfts'
import { orderHandlers } from './orders'
import { profileHandlers } from './profile'
import { walletHandlers } from './wallets'

export const restHandlers = [
  ...authHandlers,
  ...nftHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...orderHandlers,
  ...walletHandlers,
  ...profileHandlers,
]
