# Eventos em tempo real (Socket.IO)

O cliente usa **socket.io-client** ([`src/shared/realtime/realtime-client.ts`](../src/shared/realtime/realtime-client.ts)). Em demonstração o servidor é simulado no navegador pelo MSW (`ws.link` + [`@mswjs/socket.io-binding`](../src/mocks/realtime/server.ts)): o protocolo Engine.IO/Socket.IO é o real, e os eventos nunca são injetados direto na interface.

## Conexão

- Uma conexão por sessão (`forceNew`), transporte `websocket`, token no `auth` do handshake (`40{"token":"…"}`).
- Login, logout ou troca de usuário fecham o socket, limpam o estado de tempo real e abrem outro: listeners e eventos de um usuário nunca chegam ao próximo.
- Reconexão automática (1 s a 5 s). Ao reconectar, as queries ativas são invalidadas para recuperar via REST o que se perdeu offline.
- `socket.io-client` só é importado depois de o backend simulado estar pronto: o Engine.IO captura o construtor `WebSocket` ao ser avaliado, e o MSW precisa ter aplicado o patch antes.

## Envelope

Todos os eventos ([`dtos/events.ts`](../src/shared/api/dtos/events.ts)) seguem o mesmo envelope, validado com zod no cliente:

```json
{
  "eventId": "evt_000042",
  "type": "nft.updated",
  "resource": { "type": "nft", "id": "nft_001" },
  "version": 7,
  "occurredAt": "2026-10-23T18:00:00.000Z",
  "userId": null,
  "data": {}
}
```

- `eventId`: identidade estável (duplicatas são descartadas).
- `version`: versão do recurso, monotônica; eventos com versão menor ou igual à última conhecida são descartados.
- `userId`: `null` para broadcast; preenchido em eventos privados, entregues só às conexões daquele usuário com sessão ainda válida.

## Eventos

### `nft.updated` (broadcast)

```json
{
  "price": "1.50",
  "compareAtPrice": null,
  "available": 12,
  "availability": "available",
  "editions": [{ "id": "nft_001_1-50", "price": "1.50", "compareAtPrice": null, "available": 12 }]
}
```

Aplicado sem refetch em detalhe, listas, destaques e carrinho ([`cache-sync.ts`](../src/shared/realtime/cache-sync.ts)). Se um item do carrinho mudou de preço ou estoque, o carrinho/checkout mostra o aviso "Itens do seu carrinho foram atualizados" (com o valor anterior e o novo), anuncia a mudança para leitores de tela e invalida a cotação: os totais voltam a vir da API.

### `order.updated` (privado)

```json
{ "status": "confirmed", "declineReason": null }
```

Atualiza o pedido em cache sem regredir estados terminais (`confirmed`/`declined` não voltam a `pending`) e busca o recibo completo via REST. Ao confirmar ou recusar, o carrinho é revalidado.

## Ordenação, duplicatas e reconciliação com REST

O `eventGuard` ([`src/domain/events.ts`](../src/domain/events.ts)) decide `apply | duplicate | stale` para cada evento:
1. `eventId` já visto ⇒ `duplicate` (memória LRU de 500 ids).
2. `version ≤` última versão conhecida do recurso ⇒ `stale`.
3. Caso contrário aplica e registra a versão.

Respostas REST também registram as versões que trazem (`eventGuard.observe`), então um evento atrasado não sobrescreve um dado mais novo vindo do REST. Os caches de detalhe e lista também comparam `version` antes de aplicar o patch.

| Situação                      | Comportamento                                                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Evento duplicado              | ignorado                                                                                                                    |
| Evento antigo (fora de ordem) | ignorado                                                                                                                    |
| Desconexão                    | status `reconnecting`; ao voltar, invalida queries ativas                                                                   |
| Pedido pendente após refresh  | o ponteiro em `localStorage` leva o checkout de volta a `/orders/:id`; refetch de segurança a cada 10 s até o evento chegar |
| Troca de usuário              | socket recriado; eventos privados filtrados por `userId` no servidor e no cliente                                           |

## Controle nos testes

`window.__mock` ([`src/mocks/control.ts`](../src/mocks/control.ts)) expõe a simulação do servidor, sempre passando pelo banco do mock e pelo servidor Socket.IO:

| Método                                        | Efeito                                       |
| --------------------------------------------- | -------------------------------------------- |
| `updateNft(nftId, patches)`                   | altera preço/estoque e publica `nft.updated` |
| `sendStaleNftEvent(nftId)`                    | envia um `nft.updated` com versão antiga     |
| `replayEvent(eventId)` / `recentEvents()`     | reenvia um evento já publicado (duplicata)   |
| `dropRealtime()` / `setRealtimeOffline(bool)` | derruba as conexões / recusa reconexões      |
| `settleOrder(orderId, outcome)`               | liquida um pedido pendente                   |
