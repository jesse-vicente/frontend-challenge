import { HttpResponse, http } from 'msw'
import { getDb, mutate } from '../db/store'
import { apiPath, route } from '../http/respond'
import { requireNft } from '../services/catalog'
import { requireAuth } from '../services/sessions'

const favoritesOf = (userId: string) => ({ nftIds: getDb().favorites[userId] ?? [] })

export const favoriteHandlers = [
  http.get(
    apiPath('/me/favorites'),
    route(({ request }) => HttpResponse.json(favoritesOf(requireAuth(request).user.id))),
  ),

  http.put<{ nftId: string }>(
    apiPath('/me/favorites/:nftId'),
    route<{ nftId: string }>(({ request, params }) => {
      const { user } = requireAuth(request)
      requireNft(params.nftId)
      mutate((db) => {
        const list = db.favorites[user.id] ?? []
        if (!list.includes(params.nftId)) list.push(params.nftId)
        db.favorites[user.id] = list
      })
      return HttpResponse.json(favoritesOf(user.id))
    }),
  ),

  http.delete<{ nftId: string }>(
    apiPath('/me/favorites/:nftId'),
    route<{ nftId: string }>(({ request, params }) => {
      const { user } = requireAuth(request)
      mutate((db) => {
        db.favorites[user.id] = (db.favorites[user.id] ?? []).filter((id) => id !== params.nftId)
      })
      return HttpResponse.json(favoritesOf(user.id))
    }),
  ),
]
