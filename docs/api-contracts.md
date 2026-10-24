# Contratos REST

Base: `VITE_API_BASE_URL` (padrão `/api`). Todos os corpos são JSON. Os contratos são schemas **zod** em [`src/shared/api/dtos/`](../src/shared/api/dtos/): o cliente Axios valida **toda** resposta contra o schema antes de entregá-la à aplicação, e os handlers MSW validam os corpos de requisição com os mesmos schemas. Um teste de contrato ([`src/mocks/handlers/handlers.test.ts`](../src/mocks/handlers/handlers.test.ts)) garante que respostas do mock respeitam os DTOs.

Valores monetários são strings decimais em ETH (`"1.19"`), calculados com `big.js` ([`src/domain/money.ts`](../src/domain/money.ts)). Datas em ISO 8601.

## Cabeçalhos

| Cabeçalho                       | Quando                | Uso                                      |
| ------------------------------- | --------------------- | ---------------------------------------- |
| `Authorization: Bearer <token>` | sessão ativa          | identifica o usuário                     |
| `X-Cart-Id: <uuid>`             | visitante (sem token) | carrinho de visitante, gerado no cliente |
| `Idempotency-Key: <uuid>`       | `POST /orders`        | mesma tentativa de compra ⇒ mesmo pedido |

## Erros

Envelope único ([`dtos/error.ts`](../src/shared/api/dtos/error.ts)):

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "…", "fields": { "email": "…" }, "details": {} } }
```

| Código                              | HTTP | Observação                                                             |
| ----------------------------------- | ---: | ---------------------------------------------------------------------- |
| `VALIDATION_ERROR`                  |  422 | `fields` por campo; o formulário mostra cada mensagem no seu campo     |
| `UNAUTHENTICATED`                   |  401 | sem sessão ou credenciais inválidas                                    |
| `SESSION_EXPIRED`                   |  401 | encerra a sessão local e leva ao login com aviso                       |
| `FORBIDDEN`                         |  403 | recurso de outro usuário                                               |
| `NOT_FOUND`                         |  404 |                                                                        |
| `CONFLICT`                          |  409 | e-mail/usuário em uso, papel/endereço de carteira duplicado (`fields`) |
| `OUT_OF_STOCK`                      |  409 |                                                                        |
| `QUOTE_STALE`                       |  409 | `details.quote` traz a cotação nova que precisa ser revisada           |
| `IDEMPOTENCY_CONFLICT`              |  409 | mesma chave com outro payload                                          |
| `COUPON_INVALID` / `COUPON_EXPIRED` |  422 |                                                                        |
| `TRANSIENT`                         |  503 | único erro (além de rede/timeout) com retry automático em queries      |

## Autenticação

| Método | Rota             | Corpo                                         | Resposta                                 |
| ------ | ---------------- | --------------------------------------------- | ---------------------------------------- |
| POST   | `/auth/login`    | `{ email, password, guestCartId? }`           | `Session` (`token`, `expiresAt`, `user`) |
| POST   | `/auth/register` | `{ username, email, password, guestCartId? }` | `Session` (201)                          |
| GET    | `/auth/session`  | —                                             | `Session` (valida o token ao iniciar)    |
| POST   | `/auth/logout`   | —                                             | 204 (revoga o token)                     |

`guestCartId` faz o servidor mesclar o carrinho do visitante no carrinho da conta.

## Catálogo

| Método | Rota               | Parâmetros / corpo                                                                                                      | Resposta                                                             |
| ------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| GET    | `/nfts`            | `q, segment, categories[], networks[], availability, priceMin, priceMax, sort, collectionId, excludeId, page, pageSize` | `{ items: NftSummary[], page, pageSize, total, totalPages, facets }` |
| GET    | `/nfts/highlights` | —                                                                                                                       | `{ featured, items }`                                                |
| GET    | `/nfts/:nftId`     | —                                                                                                                       | `NftDetail` (edições, galeria, avaliações…)                          |

Arrays usam chaves repetidas (`?categories=music&categories=3d-art`). Todo NFT tem `version`; a versão vista via REST vira a base que eventos de tempo real precisam superar.

## Carrinho e cotação

| Método | Rota                  | Corpo                            | Resposta                                      |
| ------ | --------------------- | -------------------------------- | --------------------------------------------- |
| GET    | `/cart`               | —                                | `Cart` (`items`, `couponCode`, `version`)     |
| POST   | `/cart/items`         | `{ nftId, editionId, quantity }` | `Cart`                                        |
| PATCH  | `/cart/items/:itemId` | `{ quantity }`                   | `Cart`                                        |
| DELETE | `/cart/items/:itemId` | —                                | `Cart`                                        |
| PUT    | `/cart/coupon`        | `{ code }`                       | `Cart` (ou `COUPON_INVALID`/`COUPON_EXPIRED`) |
| DELETE | `/cart/coupon`        | —                                | `Cart`                                        |
| POST   | `/quote`              | `{ network }`                    | `Quote`                                       |

Toda mutação de carrinho responde com o carrinho completo. Os **totais nunca são calculados na interface**: vêm de `Quote` (`subtotal`, `discount`, `networkFee`, `total`, `lines[].issue`, `purchasable`, `expiresAt`). Linhas com problema trazem `issue` (`sold-out`, `quantity-reduced`, `invalid-quantity`); cupom que deixou de valer vem em `couponRejection`.

## Pedidos

| Método | Rota               | Corpo                                                                     | Resposta                              |
| ------ | ------------------ | ------------------------------------------------------------------------- | ------------------------------------- |
| POST   | `/orders`          | `{ quoteId, walletId, provider, network, collector }` + `Idempotency-Key` | `Order` (201; 200 ao repetir a chave) |
| GET    | `/orders/:orderId` | —                                                                         | `Order`                               |

O servidor revalida preço, estoque, cupom e taxa contra uma cotação nova. Qualquer diferença responde `409 QUOTE_STALE` com a cotação nova, e o checkout exige nova confirmação. `Order` é um **snapshot imutável** (itens, valores, carteira, dados do colecionador) com `status` `pending → confirmed | declined`, `transaction` (hash e link simulados) e `declineReason`.

## Conta

| Método       | Rota                            | Corpo                                                               | Resposta                                             |
| ------------ | ------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| GET          | `/me`                           | —                                                                   | `Profile`                                            |
| PATCH        | `/me`                           | `{ displayName, username, email, ensName, walletNickname }`         | `Profile` (409 com `fields` em conflito)             |
| PUT          | `/me/avatar`                    | `multipart/form-data` (`avatar`: PNG/JPG/WebP, ≤ 1 MB)              | `Profile`                                            |
| DELETE       | `/me/avatar`                    | —                                                                   | `Profile`                                            |
| PUT          | `/me/password`                  | `{ currentPassword, newPassword }`                                  | 204 (`fields.currentPassword` se incorreta)          |
| GET          | `/me/favorites`                 | —                                                                   | `{ nftIds }`                                         |
| PUT / DELETE | `/me/favorites/:nftId`          | —                                                                   | `{ nftIds }`                                         |
| GET          | `/me/wallets`                   | —                                                                   | `Wallet[]`                                           |
| POST         | `/me/wallets`                   | `UpsertWallet` (`role`, `label`, `address`, `network`, `provider`…) | `Wallet` (201)                                       |
| PATCH        | `/me/wallets/:walletId`         | `UpsertWallet`                                                      | `Wallet`                                             |
| POST         | `/me/wallets/:walletId/connect` | `{ provider }`                                                      | `{ status: 'connected' \| 'rejected', connectedAt }` |

Uma carteira por papel (`primary`/`secondary`) e endereços únicos por usuário: conflitos voltam como `409` com `fields.role` ou `fields.address`.
