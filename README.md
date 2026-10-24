# Kurio — Marketplace de NFTs

SPA do desafio frontend (enunciado em [`docs/CHALLENGE.md`](docs/CHALLENGE.md)): catálogo, detalhe, carrinho, pagamento com carteira, recibo, conta (perfil, carteiras, favoritos) e tempo real, com backend **simulado no navegador** por MSW (REST + Socket.IO).
- **Aplicação publicada:** _(link do deploy)_
- **Contas de teste:** `alice@nft.test` e `bob@nft.test`, senha `Senha123` (detalhes e cupons em [Credenciais](#credenciais-e-dados-fictícios))
- **Arquitetura e decisões:** [`ARCHITECTURE.md`](ARCHITECTURE.md)
- **Contratos REST:** [`docs/api-contracts.md`](docs/api-contracts.md) · **Eventos:** [`docs/realtime-events.md`](docs/realtime-events.md)

## Stack

Vite 8, React 19, TypeScript 6, TanStack Router (rotas por arquivo) + TanStack Query 5, Axios, zod 4, socket.io-client, MSW 2 (`@mswjs/socket.io-binding`), Tailwind CSS 4, shadcn/ui (Radix), react-hook-form, big.js. Qualidade: Biome, Vitest, Playwright, Lighthouse, commitlint + husky.

## Requisitos e instalação

- Node.js ≥ 22 e pnpm 10 (`corepack enable`).

```bash
pnpm install
pnpm exec playwright install chromium   # só para os testes E2E e o Lighthouse
pnpm dev                                 # http://localhost:5173, com mocks
```

## Variáveis de ambiente

Arquivos versionados: `.env.development`, `.env.production` e `.env.example` (mesmos valores).

| Variável            | Padrão    | Descrição                                                             |
| ------------------- | --------- | --------------------------------------------------------------------- |
| `VITE_ENABLE_MOCKS` | `true`    | Liga o backend simulado (MSW). O build publicado também usa os mocks. |
| `VITE_API_BASE_URL` | `/api`    | Base das rotas REST.                                                  |
| `VITE_SOCKET_URL`   | _(vazio)_ | Origem do Socket.IO; vazio usa a origem da página.                    |

## Credenciais e dados fictícios

| Usuário                   | E-mail           | Senha      |
| ------------------------- | ---------------- | ---------- |
| Alice (2 carteiras)       | `alice@nft.test` | `Senha123` |
| Bob (1 carteira, sem ENS) | `bob@nft.test`   | `Senha123` |

Cupons: `WELCOME10` (10%), `NFT5` (0,05 ETH, subtotal mínimo 0,5 ETH), `EXPIRED20` (expirado).

O banco do mock é gerado por seed determinística (72 NFTs) e persistido em `localStorage`; o cenário ativo também.

## Cenários e reset

Selecione pela URL de qualquer rota, por exemplo `/?scenario=payment-declined`. O parâmetro é lido no boot e removido da URL; o cenário fica ativo até ser trocado.

| Cenário                        | Efeito                                                                      |
| ------------------------------ | --------------------------------------------------------------------------- |
| `default`                      | tudo funciona, latência de 150–350 ms, pagamento confirmado                 |
| `empty`                        | catálogo sem resultados                                                     |
| `slow`                         | todas as respostas levam ~2,5 s                                             |
| `variable-latency`             | 100 ms a 2 s, respostas fora de ordem (sequência reproduzível)              |
| `offline`                      | toda requisição falha por rede                                              |
| `server-error`                 | catálogo e detalhe respondem 503                                            |
| `favorites-failure`            | favoritar falha (rollback otimista)                                         |
| `session-expired`              | sessões expiram 45 s após o login                                           |
| `unauthorized`                 | recursos privados respondem 403                                             |
| `price-change-during-checkout` | o preço sobe 10% no envio do pedido                                         |
| `edition-sold-out`             | uma edição esgota no envio do pedido                                        |
| `order-timeout`                | a 1ª resposta do pedido excede o timeout; o reenvio recupera o mesmo pedido |
| `payment-declined`             | pedidos são recusados                                                       |
| `wallet-rejected`              | a carteira recusa a conexão                                                 |

**Reset** dos dados: `?mock-reset` (pode combinar: `/?mock-reset&scenario=slow`) ou, no console, `window.__mock.reset()`.

`window.__mock` também permite disparar eventos e falhas pelo servidor simulado — veja [`src/mocks/control.ts`](src/mocks/control.ts) e [`docs/realtime-events.md`](docs/realtime-events.md#controle-nos-testes).

## Como reproduzir os fluxos de falha

| Fluxo                   | Passos                                                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Pagamento recusado      | `/?mock-reset&scenario=payment-declined` → comprar → finalizar → "Pagamento recusado", carrinho preservado                          |
| Timeout com recuperação | `scenario=order-timeout` → confirmar → após ~8 s aparece a nova tentativa → reenviar: mesmo pedido (`__mock.status().orders === 1`) |
| Preço muda na compra    | `scenario=price-change-during-checkout` → confirmar → revisão mostra a diferença e pede "Confirmar com os novos valores"            |
| Esgotou na compra       | `scenario=edition-sold-out` → confirmar → item indisponível bloqueia o pagamento                                                    |
| Evento em tempo real    | com o checkout aberto, no console: `__mock.updateNft('nft_001', [{ editionId: 'nft_001_1-50', price: '1.5' }])`                     |
| Evento antigo/duplicado | `__mock.sendStaleNftEvent('nft_001')` / `__mock.replayEvent(__mock.recentEvents().at(-1).eventId)` → ignorados                      |
| Desconexão              | `__mock.setRealtimeOffline(true)`, altere um preço, `__mock.setRealtimeOffline(false)` → a reconexão recupera o valor               |
| Sessão expirada         | `__mock.expireSession()` com o checkout aberto → próxima ação leva ao login com aviso; o formulário volta preenchido                |
| Rede/servidor           | `scenario=offline` ou `server-error` → erro com "Tentar novamente"; `scenario=slow` → skeletons                                     |
| Favoritos               | `scenario=favorites-failure` → favoritar → toast de erro e coração volta ao estado anterior                                         |
| Conexão recusada        | `scenario=wallet-rejected` → confirmar → mensagem da carteira                                                                       |

## Comandos

| Comando                         | Descrição                                                                   |
| ------------------------------- | --------------------------------------------------------------------------- |
| `pnpm dev`                      | desenvolvimento com mocks                                                   |
| `pnpm build`                    | verificação de tipos + build de produção (`dist/`)                          |
| `pnpm preview`                  | serve o build (porta 4173)                                                  |
| `pnpm typecheck`                | TypeScript sem emitir                                                       |
| `pnpm check` / `pnpm check:fix` | Biome (lint + formatação)                                                   |
| `pnpm test:unit`                | Vitest (domínio, contratos cliente↔mock, sincronização de cache)            |
| `pnpm test:e2e`                 | Playwright (build + preview automáticos; desktop e mobile)                  |
| `pnpm test:e2e:update`          | regenera as baselines visuais                                               |
| `pnpm test:e2e:report`          | abre o relatório HTML                                                       |
| `pnpm lighthouse`               | build + 3 auditorias por página/perfil, relatórios em `lighthouse/reports/` |
| `pnpm images:optimize`          | regenera os WebP a partir de `design/source/`                               |

## Testes E2E

56 testes em Chromium ([`tests/e2e/`](tests/e2e/)): projeto `desktop` (1440 px) roda tudo; `mobile` (390 px) roda os fluxos marcados com `@mobile`. Cada teste usa um contexto novo e reseta o backend simulado (`?mock-reset`). Cobertura dos 12 grupos do enunciado:

| Grupo                                                                                                                         | Spec                      |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Busca, filtros, ordenação, paginação, histórico; detalhe e 404                                                                | `catalog.spec.ts`         |
| Cadastro, login, expiração (relógio controlado com `page.clock`), logout, troca de usuário                                    | `auth.spec.ts`            |
| Favoritos (falha e recuperação); carrinho, cupom, persistência após refresh/login                                             | `favorites-cart.spec.ts`  |
| Compra completa, recusa, clique repetido, timeout, pedido pendente; Socket.IO (preço, esgotado, duplicado/antigo, desconexão) | `checkout.spec.ts`        |
| Perfil, avatar, senha, carteiras, validações                                                                                  | `account.spec.ts`         |
| Teclado, foco de diálogos, validação; skeletons, falhas e nova tentativa                                                      | `a11y-resilience.spec.ts` |
| Regressão visual de início, detalhe, carrinho e pagamento                                                                     | `visual.spec.ts`          |

Falhas guardam trace, vídeo e screenshot (`test-results/`); o relatório HTML fica em `playwright-report/`. As baselines visuais (`tests/e2e/__screenshots__/`) foram geradas em Windows; em outro SO, rode `pnpm test:e2e:update` antes da primeira comparação (fontes são renderizadas de forma diferente).

## Lighthouse

`pnpm lighthouse` audita início e detalhe em mobile e desktop, 3 execuções cada, no build de produção com o cenário padrão. Mediana ([`lighthouse/reports/summary.md`](lighthouse/reports/summary.md)):

| Página  | Perfil  | Performance | Accessibility | Best Practices | SEO |    LCP | CLS |    TBT |
| ------- | ------- | ----------: | ------------: | -------------: | --: | -----: | --: | -----: |
| início  | mobile  |          62 |           100 |            100 | 100 | 5,46 s |   0 | 295 ms |
| início  | desktop |          97 |           100 |            100 | 100 | 1,11 s |   0 |  44 ms |
| detalhe | mobile  |          65 |           100 |            100 | 100 | 4,89 s |   0 | 278 ms |
| detalhe | desktop |          97 |           100 |            100 | 100 | 1,08 s |   0 |  26 ms |

Performance mobile fica abaixo da meta de 90 e varia alguns pontos entre execuções (feche servidores de desenvolvimento antes de auditar); a análise das causas e da variação está em [`ARCHITECTURE.md`](ARCHITECTURE.md#performance).

## Deploy

Vercel, com `vercel.json` reescrevendo todas as rotas para `index.html` (acesso direto e refresh funcionam). O build de produção inclui os mocks (`.env.production`).
