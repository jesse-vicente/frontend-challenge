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
- Entrar no desktop é um modal sobre a página atual, guiado pela URL (`?auth=login|register&redirect=…`, validados na rota raiz): o header, o "Favoritar" e as rotas privadas abrem o modal sem sair da página. A guarda de rota usa a última página resolvida (`router.subscribe('onResolved')`), porque a URL já mudou quando ela roda. Ao entrar, segue para `redirect` ou fica na página; fechar volta no histórico. No mobile, e em links diretos para rota privada, continua a tela `/login` (com a página inicial atrás no desktop).
- O checkout guarda um rascunho do formulário em `sessionStorage` por usuário: após expirar e entrar de novo, o colecionador volta aos mesmos dados.
- Logout e troca de usuário removem **todo** o cache privado do dono anterior e recriam o socket. Todas as chaves privadas começam com `['private', owner]`, então uma única `removeQueries` limpa o escopo.

## Estado do carrinho

- O carrinho pertence ao servidor. Visitantes têm um id gerado no cliente (`X-Cart-Id`); no login/cadastro o servidor mescla o carrinho do visitante no da conta e o id local é descartado.
- Toda mutação responde com o carrinho completo, gravado direto no cache. A alteração de quantidade é **otimista** com rollback; as mutations do carrinho compartilham um `scope`, então cliques rápidos são aplicados em ordem. Enquanto houver mutations do carrinho na fila, a resposta de uma anterior não é gravada (voltaria o contador para um valor antigo): só a última grava o carrinho e invalida a cotação. Se a última falhar, o carrinho é recarregado do servidor. O total da linha usa a cotação apenas quando ela já reflete a quantidade atual.
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

Requisições sem interação, todas intencionais: ao voltar para a aba (`visibilitychange`), queries vencidas são refeitas (o carrinho sempre, o catálogo após 30 s); passar o mouse num link pré-carrega a rota (`defaultPreload: 'intent'`), e o loader só busca o que estiver vencido; numa reconexão do socket, as queries ativas são refeitas. Com a aba parada e visível não há polling (exceto o pedido pendente). Em `pnpm dev`, o `StrictMode` monta a página duas vezes e as primeiras buscas aparecem duplicadas (uma cancelada); no build de produção cada uma sai uma vez.

## Reconciliação REST × Socket.IO

Detalhes em [`docs/realtime-events.md`](docs/realtime-events.md). Em resumo: cada recurso tem `version`; o `eventGuard` descarta eventos duplicados (`eventId`) e antigos (`version` ≤ última conhecida), e as respostas REST também registram versões. Patches de cache comparam versões antes de aplicar. Após uma reconexão, as queries ativas são invalidadas para buscar o que se perdeu. Eventos privados são filtrados por `userId` no servidor e no cliente.

## Boot com o backend simulado

1. `main.tsx` lê e remove `?scenario`/`?mock-reset` da URL **antes** de o router existir.
2. O chunk dos mocks e o do app são baixados em paralelo (`modulepreload`); o app renderiza sem esperar o MSW.
3. Requisições REST e o socket aguardam `backendReady()` (início do worker). `socket.io-client` só é importado depois disso, porque o Engine.IO captura o construtor `WebSocket` ao ser avaliado — e o MSW precisa ter aplicado o patch. Por isso o import de tipos desse pacote é `import type` (um `import { type … }` manteria um import de efeito colateral).
4. O navegador encerra service workers ociosos (numa aba oculta os timers são estrangulados e o keepalive do MSW para de chegar). O worker reiniciado esquece a página e deixa as requisições irem para a rede (404 até recarregar). Por isso `startMocks` devolve uma verificação que o `backendReady()` roda antes de cada requisição: se o worker não foi confirmado nos últimos 10 s, a página se registra de novo (`MOCK_ACTIVATE`) antes de seguir (`src/mocks/worker-keeper.ts`). O socket não depende do worker (a interceptação de WebSocket roda na página).

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
- Hero da home virou carrossel: o slide do Figma e mais duas variações (lançamentos e em alta) com a mesma estrutura. Troca a cada 7 s e pausa com o mouse sobre o carrossel, com foco do teclado, com a aba oculta e com `prefers-reduced-motion` (sem botão de pausar, a pedido; no toque não há pausa, só swipe e pontos). Swipe no mobile. O título do slide passou a `h2`, e a página tem um `h1` visualmente oculto.
- Header desktop fixo no topo, sempre do mesmo tamanho: ao rolar, ganha fundo translúcido (glass) e o sublinhado do menu desliza para "Mercado" quando o catálogo chega ao header, e fica nele até o fim da página (destaques, Diário e rodapé fazem parte do mercado). Só o item da seção atual tem `aria-current` (o router marcaria "Início" junto). Âncoras rolam suavemente e as seções têm margem para o header.
- Âncoras da URL em inglês, como as rotas (`#market`, `#favorites`, `#content` do link "pular para o conteúdo").
- Tag de raridade (RARO/ÉPICO/LENDÁRIO) também no card desktop. Só RARO aparece no Figma (cor primária); ÉPICO usa lilás (`--rarity-epic`) e LENDÁRIO dourado (`--rarity-legendary`), ambos com texto escuro. A tag tem largura mínima do Figma (68 px) e cresce com o texto.
- Carrinho: cabeçalho da tabela com a mesma altura e linha do título "Resumo da carteira" (alinhados) e 40 px entre a trilha de navegação e o conteúdo (no frame ficam colados). Carrinho vazio: o aviso ocupa toda a largura. Linhas da tabela com 70 px, arte 70×70 e colunas do frame (311/138/137 px); lixeira do layout como componente (`TrashIcon`, em `currentColor`).
- Cards do Diário da Cunhagem são clicáveis por inteiro e animam no hover.
- Card do catálogo no hover: a moldura fica fixa e só a arte aproxima (escala 1,08 rumo ao rosto, dentro de `overflow-hidden`); o `sizes` prevê a ampliação para a imagem não perder nitidez. Ícones das redes sociais do rodapé sobem com um brilho no hover.
- Destaques do desktop: coluna de texto de 298 px (no Figma, 290) para "Arte digital selecionada" caber em 3 linhas, como o card ao lado, alinhando os botões "Explorar".
- "Compartilhar este NFT": LinkedIn e X sem moldura, na cor do texto (o frame reaproveitava os ícones laranja do rodapé).
- Imagem ampliada do detalhe: ocupa até 900 px (limitada pela altura da janela), e o fechar é um botão circular escuro, visível sobre artes claras.
- Mobile: os cards de destaque ("Lançamentos gênesis…", "Arte digital selecionada…") e o Diário da Cunhagem também aparecem (o frame mobile não os tem). Os destaques usam tipografia menor para caber nos 250 px; o Diário vira uma linha com rolagem horizontal e snap. A paginação do catálogo fica centralizada.
- Filtros no mobile: ordenar e "Aplicar" do preço fecham o bottom sheet (desliza para baixo) e, ao fim da animação, a página rola até os resultados; as caixas de coleção e rede mantêm o sheet aberto para seleção múltipla. Como nesse caso nada fecha o sheet sozinho (e o X só fecha, sem levar aos resultados), há um botão fixo "Ver N NFTs", que não existe no frame: encerra a seleção, leva aos resultados e já mostra quantos NFTs os filtros retornam.
- Rodapé mobile: os três destaques ficam com o selo ao lado do texto, os links mantêm altura de linha normal quando quebram e o copyright não tem mais o entrelinha de 30 px.
- Hero mobile: os três slides têm a altura do maior (o primeiro), então os pontos ficam sempre dentro do card. O swipe usa `touch-action: pan-y` (sem isso o navegador assume o gesto e cancela o ponteiro) e um swipe que termina no link não o abre.
- Microanimações (só sem `prefers-reduced-motion`): seções e cards sobem e aparecem na primeira vez que entram na tela, em sequência nas grades (`useReveal`, um único `IntersectionObserver`); o slide ativo do hero entra em cascata no carregamento e a cada troca. Título e arte do hero animam só com `transform`, sem opacidade, para não atrasar o LCP. As baselines visuais são capturadas com movimento reduzido.
- Login/cadastro: modal sobre a página atual no desktop (ver Sessão). Fechar (X, Esc ou "Voltar" na tela cheia mobile, que não tem botão no frame) volta à página anterior, ou ao início sem histórico. Antes ia para o `redirect`, e uma rota privada mandava de volta ao login. Alternar entre Entrar e Criar conta substitui a entrada do histórico.
- O carrossel do hero e a seção de destaques tinham o mesmo nome acessível ("Destaques da Kurio"); a segunda passou a "Lançamentos e curadoria".
- Paddings simétricos no botão "Enviar" da newsletter e no selo de carteiras compatíveis (no Figma o lado direito é menor); o copyright tem o mesmo espaçamento acima e abaixo.

## Limitações

- Backend, pagamento, conexão de carteira e hash de transação são simulados; nenhuma transação real acontece.
- Os dados do mock vivem no `localStorage` de cada navegador; não há compartilhamento entre dispositivos.
- Sessão por token em `localStorage` (ver Sessão).
- Baselines visuais geradas em Windows; outros sistemas precisam regerá-las.
