import { HttpResponse, http } from 'msw'
import { walletConflict } from '@/domain/wallet'
import {
  connectWalletRequestSchema,
  type UpsertWalletRequest,
  upsertWalletRequestSchema,
  type WalletDto,
} from '@/shared/api/dtos/wallet'
import { getDb, mutate, nextId } from '../db/store'
import { type WalletRecord } from '../db/types'
import { apiPath, MockHttpError, notFound, readJson, route } from '../http/respond'
import { behavior } from '../scenarios/runtime'
import { requireAuth } from '../services/sessions'

const CONFLICT_FIELDS = {
  'role-taken': { role: 'Já existe uma carteira com este papel.' },
  'address-taken': { address: 'Este endereço já está cadastrado.' },
} as const

function toWalletDto({ userId: _userId, ...wallet }: WalletRecord): WalletDto {
  return wallet
}

function walletsOf(userId: string): WalletRecord[] {
  return getDb().wallets.filter((wallet) => wallet.userId === userId)
}

function assertNoConflict(userId: string, candidate: UpsertWalletRequest & { id?: string }) {
  const conflict = walletConflict(walletsOf(userId), candidate)
  if (conflict) {
    throw new MockHttpError('CONFLICT', 'Não foi possível salvar a carteira.', { fields: CONFLICT_FIELDS[conflict] })
  }
}

export const walletHandlers = [
  http.get(
    apiPath('/me/wallets'),
    route(({ request }) => HttpResponse.json(walletsOf(requireAuth(request).user.id).map(toWalletDto))),
  ),

  http.post(
    apiPath('/me/wallets'),
    route(async ({ request }) => {
      const { user } = requireAuth(request)
      const body = await readJson(request, upsertWalletRequestSchema)
      assertNoConflict(user.id, body)
      const wallet: WalletRecord = {
        id: nextId('wallet'),
        userId: user.id,
        ...body,
        address: body.address.toLowerCase(),
        updatedAt: new Date().toISOString(),
      }
      mutate((db) => {
        db.wallets.push(wallet)
      })
      return HttpResponse.json(toWalletDto(wallet), { status: 201 })
    }),
  ),

  http.patch<{ walletId: string }>(
    apiPath('/me/wallets/:walletId'),
    route<{ walletId: string }>(async ({ request, params }) => {
      const { user } = requireAuth(request)
      const body = await readJson(request, upsertWalletRequestSchema)
      if (!walletsOf(user.id).some((wallet) => wallet.id === params.walletId)) {
        throw notFound('Carteira não encontrada.')
      }
      assertNoConflict(user.id, { ...body, id: params.walletId })
      const updated = mutate((db) => {
        const wallet = db.wallets.find((item) => item.id === params.walletId)
        if (!wallet) throw notFound('Carteira não encontrada.')
        Object.assign(wallet, body, { address: body.address.toLowerCase(), updatedAt: new Date().toISOString() })
        return wallet
      })
      return HttpResponse.json(toWalletDto(updated))
    }),
  ),

  http.post<{ walletId: string }>(
    apiPath('/me/wallets/:walletId/connect'),
    route<{ walletId: string }>(async ({ request, params }) => {
      const { user } = requireAuth(request)
      if (!walletsOf(user.id).some((wallet) => wallet.id === params.walletId)) {
        throw notFound('Carteira não encontrada.')
      }
      const { provider } = await readJson(request, connectWalletRequestSchema)
      const approved = behavior().walletConnection === 'approve'
      return HttpResponse.json({
        walletId: params.walletId,
        provider,
        status: approved ? 'connected' : 'rejected',
        connectedAt: approved ? new Date().toISOString() : null,
      })
    }),
  ),
]
