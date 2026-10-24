# Arquitetura

## Visão geral

```
src/domain          regras puras e testadas (dinheiro, NFT, carrinho, cotação, pedido, eventos, idempotência, conta, carteira)
src/shared/api      cliente Axios (valida respostas com zod), ApiError, query keys, DTOs (contratos)
src/shared/realtime socket.io-client por sessão, eventGuard (duplicatas/versão), sincronização de cache
src/shared/session  sessionStore (token), dono do cache (user:<id> | guest:<cartId>)
src/shared/ui|components  primitivos shadcn/Radix e componentes do layout
src/features/*      catalog, nft, cart, checkout, orders, auth, favorites, wallets, profile
src/mocks           MSW: seed determinística + persistência, cenários, handlers REST, servidor Socket.IO, window.__mock
src/routes          rotas por arquivo (TanStack Router); _authenticated = guarda das rotas privadas
src/app             query client, router, ponte de autenticação, layout (header, footer, tab bar)
```

As fronteiras são verificadas pelo lint (`noRestrictedImports` em [`biome.json`](biome.json)): `domain` não importa nada do projeto nem frameworks; `dtos` só dependem de `domain` e zod; `shared` não conhece `features`, `routes`, `app` nem `mocks`; `features` não importam `routes`, `app` nem `mocks`.

## Decisões principais

| Decisão                                                      | Motivo                                                                                                                                        |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Contratos como schemas zod compartilhados por cliente e mock | Uma fonte da verdade; respostas inválidas viram erro tipado em vez de dados corrompidos na UI.                                                |
| Regras de negócio em `domain` (puro)                         | Testáveis sem DOM; usadas pela UI e pelo servidor simulado (mesma política de senha, conflitos de carteira, diff de cotação).                 |
| Estado da URL como fonte do catálogo                         | Filtros, aba, ordenação e página vivem na URL (com `catch` em cada campo): links compartilháveis e histórico do navegador restauram o estado. |
| Totais sempre da API (`/quote`)                              | Desconto, taxa e disponibilidade são do servidor; a interface nunca soma preços.                                                              |
| Servidor simulado com o protocolo real                       | MSW intercepta `fetch`/XHR e o WebSocket; o app usa Axios e socket.io-client como faria contra um backend real.                               |
| Mutations sem retry automático                               | Só o pedido é reenviado, e manualmente, com a mesma chave de idempotência.                                                                    |

## Sessão

- Login/cadastro devolvem `{ token, expiresAt, user }`. O **token é o único segredo guardado no cliente** (`localStorage`, chave `nft:session`); senhas nunca são persistidas. Escolha consciente para uma SPA sem backend próprio: um backend real usaria cookie `HttpOnly`.
- No boot, `GET /auth/session` valida o token. Qualquer `401 SESSION_EXPIRED/UNAUTHENTICATED` numa requisição que levou token encerra a sessão local (`sessionStore.end`), o router reavalia as guardas e a rota privada vai para `/login?redirect=<rota>` com o aviso "Sua sessão expirou".
- O checkout guarda um rascunho do formulário em `sessionStorage` por usuário: após expirar e entrar de novo, o colecionador volta aos mesmos dados.
- Logout e troca de usuário removem **todo** o cache privado do dono anterior e recriam o socket. Todas as chaves privadas começam com `['private', owner]`, então uma única `removeQueries` limpa o escopo.

## Estado do carrinho

- O carrinho pertence ao servidor. Visitantes têm um id gerado no cliente (`X-Cart-Id`); no login/cadastro o servidor mescla o carrinho do visitante no da conta e o id local é descartado.
- Toda mutação responde com o carrinho completo, gravado direto no cache. A alteração de quantidade é **otimista** com rollback; as mutations do carrinho compartilham um `scope`, então cliques rápidos são aplicados em ordem.
- A cotação (`POST /quote`, por rede) é invalidada a cada mudança de carrinho ou evento de preço. Ela informa linhas com problema (`sold-out`, `quantity-reduced`), cupom rejeitado e `purchasable`; o botão de finalizar respeita isso.
- No checkout, "Confirmar compra" busca uma cotação nova e compara com a exibida (`diffQuotes`): diferenças aparecem na revisão e exigem nova confirmação. O servidor revalida tudo de novo no `POST /orders` e responde `409 QUOTE_STALE` com a cotação nova se algo mudou.

## Pedido e idempotência

- A chave de idempotência é derivada da tentativa: mesmo payload ⇒ mesma chave (guardada em `sessionStorage`), payload diferente ⇒ nova tentativa. Clique duplo, timeout (8 s no cliente) e reload reutilizam a chave e recebem o mesmo pedido.
- Pedido pendente fica registrado em `localStorage`; ao voltar ao checkout o usuário é levado a `/orders/:id`. A página do pedido escuta `order.updated` e faz um refetch de segurança a cada 10 s.
- O recibo mostra o **snapshot** do pedido (itens, valores, carteira), não o catálogo atual.

## Estratégia de cache (TanStack Query)

| Dado                         | staleTime | Observações                                                                |
| ---------------------------- | --------- | -------------------------------------------------------------------------- |
| Catálogo (listas, destaques) | 30 s      | `keepPreviousData` na troca de filtros; eventos aplicam patch por versão   |
| Detalhe do NFT               | 30 s      | patch por evento; versão REST registrada no `eventGuard`                   |
| Carrinho, cotação            | 0         | refetch ao focar; eventos atualizam o carrinho e invalidam a cotação       |
| Perfil, carteiras            | 5 min     | mutations gravam a resposta no cache e atualizam o usuário da sessão       |
| Favoritos                    | padrão    | toggle otimista com rollback (inclusive quando a lista ainda não carregou) |
| Pedido                       | —         | eventos + refetch de segurança enquanto pendente                           |

Queries só repetem falhas transitórias (rede, timeout, 5xx), até 2 vezes com backoff. Erros aparecem com mensagem e "Tentar novamente".

## Reconciliação REST × Socket.IO

Detalhes em [`docs/realtime-events.md`](docs/realtime-events.md). Em resumo: cada recurso tem `version`; o `eventGuard` descarta eventos duplicados (`eventId`) e antigos (`version` ≤ última conhecida), e as respostas REST também registram versões. Patches de cache comparam versões antes de aplicar. Após uma reconexão, as queries ativas são invalidadas para buscar o que se perdeu. Eventos privados são filtrados por `userId` no servidor e no cliente.

## Boot com o backend simulado

1. `main.tsx` lê e remove `?scenario`/`?mock-reset` da URL **antes** de o router existir.
2. O chunk dos mocks e o do app são baixados em paralelo (`modulepreload`); o app renderiza sem esperar o MSW.
3. Requisições REST e o socket aguardam `backendReady()` (início do worker). `socket.io-client` só é importado depois disso, porque o Engine.IO captura o construtor `WebSocket` ao ser avaliado — e o MSW precisa ter aplicado o patch. Por isso o import de tipos desse pacote é `import type` (um `import { type … }` manteria um import de efeito colateral).

## Performance

Mediana de 3 execuções (`lighthouse/reports/summary.md`): desktop 98 em início e detalhe; Accessibility, Best Practices e SEO em 100 em todos os perfis; CLS 0. **Performance mobile fica abaixo da meta: 66 (início) e 74 (detalhe), LCP ~4,5–4,8 s.**

Causas identificadas nos relatórios:
1. **O backend simulado roda no navegador.** O chunk dos mocks (MSW, binding Socket.IO, fixtures e regras do servidor) tem ~175 kB gzip e é o maior custo de CPU no boot (~1,1 s de execução com a CPU 4× mais lenta do perfil mobile). Num produto real ele não existiria; aqui faz parte da entrega e a auditoria não o remove.
2. **SPA sem renderização no servidor.** Nada pinta antes de o JavaScript do app executar; com o throttling simulado (Slow 4G, ~1,6 Mbps) o FCP fica perto de 4 s. O elemento LCP do início é uma arte decorativa estática do hero, que só aparece quando o React renderiza.
3. **Latência simulada da API (150–350 ms por chamada)** no detalhe, cujo LCP é a imagem do NFT e depende de `GET /nfts/:id`.

Medidas aplicadas e medidas: pré-carregamento dos chunks de boot, renderização em paralelo à inicialização do MSW, conteúdo com altura mínima (zerou o CLS de 0,18 no detalhe), imagens WebP 400/800 com `srcset`, fonte local com `preload`, rotas com code splitting. Testei carregar os mocks só depois do chunk do app: piorou (66/69) e foi revertido. Próximos passos possíveis: pré-renderizar o shell estático das rotas públicas, reduzir o seed/fixtures do mock carregado no boot e trocar zod pela variante `zod/mini` nos DTOs.

## Desvios do Figma e decisões de UX

- Preço anterior riscado (`<del>`); filtro selecionado também sublinhado (não só por cor); rótulos "Contrato"/"Direitos autorais" corrigidos (estavam trocados); labels visuais ocultos (sr-only) onde o layout só tem placeholder.
- Ícones sem asset exportável: lucide-react (lupa, estrelas, +/−, coração, lixeira, olho, envelope, voltar, itens da sidebar "Meu perfil"); Google/Facebook com o SVG oficial; LinkedIn/X do compartilhar reutilizam os SVGs sociais do rodapé.
- Imagens: as 4 artes do arquivo convertidas para WebP 400/800 (`pnpm images:optimize`). Ícone central da tab bar exportado sem os retângulos de fundo do frame.
- Preço formatado como `1.19 ETH` (ponto, como no layout). Overlay leve no modal de login.
- Ações fora do escopo (Criadores, Aprenda, Diário, newsletter, ajuda, login social, recuperar senha, Atividade, Ofertas, Arquivos baixados, Suporte) informam "estará disponível em breve".
- Pagamento: "Nome ENS" tem o seletor `.eth` **e** o campo do nome (o frame só mostra o seletor); os provedores aparecem como MetaMask, WalletConnect e Coinbase Wallet.
- Perfil: um único "Salvar" para dados e senha, como no frame; o bloco de senha só é validado quando preenchido. O avatar é salvo na hora (Alterar/Remover).
- "Lista de interesse" (favoritos) não tem frame: é uma seção de `/profile` (`#favorites`) com os cards do catálogo; a tab bar e o rodapé apontam para ela.
- Carteiras: "Adicionar" da principal leva o foco ao formulário quando ainda não há carteira; "Igual à carteira principal" copia os dados para a secundária, exceto apelido e endereço (que precisam ser únicos).
- Perfil e Carteiras não têm frame mobile: a sidebar vira uma linha de chips com rolagem horizontal e os campos empilham.
- Pontos do carrossel mantêm 12 px visíveis dentro de uma área de toque de 24 px (WCAG 2.5.8); a linha ficou 12 px mais alta.
- O conteúdo ocupa no mínimo a altura da viewport, então o rodapé de páginas curtas (ex.: pagamento) fica um pouco mais abaixo que no frame.
- Hero da home virou carrossel: o slide do Figma e mais duas variações (lançamentos e em alta) com a mesma estrutura. Troca a cada 7 s e pausa com hover, foco, aba oculta e `prefers-reduced-motion`; há um botão de pausar ao lado dos pontos (WCAG 2.2.2) e swipe no mobile. O título do slide passou a `h2`, e a página tem um `h1` visualmente oculto.
- Header desktop fixo no topo: ao rolar, fica compacto com fundo translúcido (glass) e o sublinhado do menu desliza para a seção visível (Início ou Mercado). Âncoras rolam suavemente e as seções têm margem para o header.
- Tag de raridade (RARO/ÉPICO/LENDÁRIO) também no card desktop.
- Cards do Diário da Cunhagem são clicáveis por inteiro e animam no hover.
- Paddings simétricos no botão "Enviar" da newsletter e no selo de carteiras compatíveis (no Figma o lado direito é menor); o copyright tem o mesmo espaçamento acima e abaixo.

## Limitações

- Backend, pagamento, conexão de carteira e hash de transação são simulados; nenhuma transação real acontece.
- Os dados do mock vivem no `localStorage` de cada navegador; não há compartilhamento entre dispositivos.
- Sessão por token em `localStorage` (ver Sessão).
- Baselines visuais geradas em Windows; outros sistemas precisam regerá-las.
