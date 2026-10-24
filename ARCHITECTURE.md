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

1. O `index.html` do build já traz a página inicial pré-renderizada (ver [Performance](#performance)). Um script inline no `<head>` ajusta o que aparece antes da primeira pintura. Em outra rota ou com parâmetros na URL, só o layout (header e tab bar, iguais para qualquer visitante) aparece até o app assumir, e o conteúdo da home fica oculto: o colecionador vê a página começar em vez de uma tela vazia (no detalhe mobile, o FCP caiu de 2,5 s para 0,9 s no Lighthouse). Com sessão salva, o header é outro, e tudo fica oculto.
2. Na página inicial pré-renderizada, os scripts começam a baixar depois da primeira pintura (carregador inline gerado no build). Nas demais páginas, baixam na hora, com `modulepreload` dos chunks de boot. O chunk dos mocks e o do app baixam em paralelo, e o app renderiza sem esperar o MSW.
3. `main.tsx` lê e remove `?scenario`/`?mock-reset` da URL **antes** de o router existir.
4. Primeira renderização: sobre a página pré-renderizada, o router carrega o chunk da rota e o React adota a marcação existente (`hydrateRoot`). As requisições só saem depois da hidratação (`holdBackendUntil`): a marcação tem todas as queries pendentes, e um dado que chegasse antes (rede rápida, CPU ocupada) apareceria onde o HTML tem skeleton, e o React descartaria a marcação (erro #418). Nas demais, o app espera os dados da rota aberta por até 1 s e renderiza do zero; acima disso aparece o skeleton da rota. Até o app montar, nada repassa o histórico ao router, então `main.tsx` faz isso durante a espera (voltar no meio da carga funciona).
5. Requisições REST e o socket aguardam `backendReady()` (início do worker). `socket.io-client` só é importado depois disso, porque o Engine.IO captura o construtor `WebSocket` ao ser avaliado — e o MSW precisa ter aplicado o patch. Por isso o import de tipos desse pacote é `import type` (um `import { type … }` manteria um import de efeito colateral).
6. O navegador encerra service workers ociosos (numa aba oculta os timers são estrangulados e o keepalive do MSW para de chegar). O worker reiniciado esquece a página e deixa as requisições irem para a rede (404 até recarregar). Por isso `startMocks` devolve uma verificação que o `backendReady()` roda antes de cada requisição: se o worker não foi confirmado nos últimos 10 s, a página se registra de novo (`MOCK_ACTIVATE`) antes de seguir (`src/mocks/worker-keeper.ts`). O socket não depende do worker (a interceptação de WebSocket roda na página).

## Performance

Mediana de 3 execuções (`lighthouse/reports/summary.md`): **início 96 no mobile e 100 no desktop; detalhe 78 no mobile e 98 no desktop.** Accessibility, Best Practices e SEO ficam em 100 em todos os perfis, e o CLS é 0. O detalhe mobile fica abaixo da meta de 90 (causas abaixo).

### Como a página inicial passou de 62 para 96

Cada mudança foi medida em A/B intercalado (o build de antes e o de depois alternados na mesma sessão do Chrome, com a máquina ociosa, mediana de 3), porque a nota mobile varia vários pontos entre auditorias do mesmo build.

| Mudança                                                                                                                                    | Por quê                                                                                                                                                                                                   | Efeito medido (mobile)                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `tldts` substituído por [`src/mocks/lib/tldts-lite.ts`](src/mocks/lib/tldts-lite.ts) (alias no `vite.config.ts`)                           | O cookie store do MSW (`tough-cookie`) embutia a lista de sufixos públicos: 256 kB, metade do chunk dos mocks. O backend simulado não usa cookies                                                         | Mocks 176 → 63 kB gzip. LCP do início 5,4 → 4,2 s; detalhe 71 → 76                          |
| Modal de login carregado sob demanda; o header mede a seção atual em `requestAnimationFrame`; primeiro render em `startTransition`         | `react-hook-form` e o painel de login saíam no boot; o header forçava o primeiro layout da página dentro do commit                                                                                        | Chunk do app 54 → 35 kB gzip. Junto com a linha anterior: início 68 → ~75, detalhe 72 → ~80 |
| **Pré-render da página inicial no build** (plugin `prerender-home` em `vite.config.ts` + [`src/app/prerender.tsx`](src/app/prerender.tsx)) | É uma SPA: nada pintava antes de ~370 kB de JS. O build de SSR renderiza `/` (deslogado, sem dados, com skeletons) no `index.html`, e o navegador hidrata essa marcação (`hydrateRoot`) sem recriar o DOM | Com as três linhas abaixo: início 74 → 94–96, LCP 4,4 → 1,9 s                               |
| Entrada animada do hero só nas trocas de slide                                                                                             | O texto do slide começava com opacidade 0: a primeira pintura não contava como conteúdo                                                                                                                   | Faz parte do resultado acima                                                                |
| Scripts da página inicial carregados depois da primeira pintura                                                                            | O Lighthouse simula o FCP/LCP com todas as requisições iniciadas antes deles; o `modulepreload` no `<head>` colocava todo o JS nessa conta                                                                | Faz parte do resultado acima                                                                |
| Artes dos slides 2 e 3 só depois da hidratação; `sizes` das variantes ocultas (arte desktop no mobile e vice-versa)                        | ~160 kB de imagens que não aparecem no primeiro frame baixavam antes do LCP (a arte de 800 px do desktop vinha até no mobile)                                                                             | Faz parte do resultado acima                                                                |

No detalhe também entraram: a primeira carga espera os dados da rota por até 1 s e pinta uma vez (antes pintava o skeleton e depois redesenhava tudo, o que gastava CPU no caminho do LCP: 68–80 contra 80–82 em 5 execuções intercaladas); o loader pré-carrega a arte do NFT assim que os dados chegam; e os formatadores `Intl` são criados no primeiro uso. Resultado: 72 → 78–83.

Testado e descartado: um chunk `vendor` único para as bibliotecas (início +4, detalhe −1: a avaliação vira uma tarefa longa maior); carregar os mocks depois do app (piorou); `content-visibility: auto` abaixo da dobra (sem efeito).

### Por que o detalhe fica em 78

O LCP do detalhe é a imagem do NFT, e ela só existe depois desta cadeia: o JavaScript do app e do backend simulado (~370 kB gzip) → o MSW sobe o service worker → `GET /nfts/:id` com a latência simulada de 150–350 ms → render → download da imagem. No Slow 4G simulado (~1,6 Mbps, CPU 4× mais lenta), só baixar o JavaScript leva cerca de 2 s, e o LCP fica em ~4,1 s. A regra da auditoria impede tirar os mocks ou a latência só para medir. Num produto real o detalhe seria renderizado no servidor com os dados (e sem o MSW no navegador). Pré-renderizar as 72 páginas de NFT no build traria preços e estoque congelados, que divergem do tempo real.

### Variação da medição

- A nota mobile varia alguns pontos entre execuções do mesmo build nesta máquina (notebook com a CPU do perfil mobile simulada 4× mais lenta). Processos em segundo plano pesam muito: um `vite dev` ocioso consumia mais de um núcleo e derrubava a nota em até 20 pontos.
- No Chrome headless (sem GPU), o FCP e o LCP só são registrados no frame seguinte à pintura. Com a página ociosa, esse frame pode demorar: nos traces, o detalhe pintava em ~700 ms e o FCP saía em ~1000 ms. Por isso o Speed Index do detalhe oscila entre 2,3 e 7,6 s nas três execuções do relatório. No navegador de verdade a apresentação acompanha a tela.

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
- Favoritar direto do card (não há no frame): coração redondo no canto da arte, acima do link do card. Com mouse aparece no hover ou foco e fica visível quando o NFT já é favorito; em tela de toque fica sempre visível (substitui o selo de favorito do mobile). Visitante abre o modal de login sobre a página.
- Conta no header: avatar (ou ícone de usuário) com o primeiro nome e uma seta, no lugar do botão laranja com o nome, que parecia uma ação.
- Card do catálogo no hover: a moldura fica fixa e só a arte aproxima (escala 1,08 rumo ao rosto, dentro de `overflow-hidden`); o `sizes` prevê a ampliação para a imagem não perder nitidez. Ícones das redes sociais do rodapé sobem com um brilho no hover.
- Destaques do desktop: coluna de texto de 298 px (no Figma, 290) para "Arte digital selecionada" caber em 3 linhas, como o card ao lado, alinhando os botões "Explorar".
- "Compartilhar este NFT": LinkedIn e X sem moldura, na cor do texto (o frame reaproveitava os ícones laranja do rodapé).
- Imagem ampliada do detalhe: ocupa até 900 px (limitada pela altura da janela), e o fechar é um botão circular escuro, visível sobre artes claras.
- Mobile: os cards de destaque ("Lançamentos gênesis…", "Arte digital selecionada…") e o Diário da Cunhagem também aparecem (o frame mobile não os tem). Os destaques usam tipografia menor para caber nos 250 px; o Diário vira uma linha com rolagem horizontal e snap. A paginação do catálogo fica centralizada.
- Filtros no mobile: ordenar e "Aplicar" do preço fecham o bottom sheet (desliza para baixo) e, ao fim da animação, a página rola até os resultados; as caixas de coleção e rede mantêm o sheet aberto para seleção múltipla. Como nesse caso nada fecha o sheet sozinho (e o X só fecha, sem levar aos resultados), há um botão fixo "Ver N NFTs", que não existe no frame: encerra a seleção, leva aos resultados e já mostra quantos NFTs os filtros retornam.
- Rodapé mobile: os três destaques ficam com o selo ao lado do texto, os links mantêm altura de linha normal quando quebram e o copyright não tem mais o entrelinha de 30 px.
- Hero mobile: os três slides têm a altura do maior (o primeiro), então os pontos ficam sempre dentro do card. O swipe usa `touch-action: pan-y` (sem isso o navegador assume o gesto e cancela o ponteiro) e um swipe que termina no link não o abre.
- Microanimações (só sem `prefers-reduced-motion`): seções e cards sobem e aparecem na primeira vez que entram na tela, em sequência nas grades (`useReveal`, um único `IntersectionObserver`); o slide ativo do hero entra em cascata a cada troca. O primeiro slide já aparece pronto no carregamento: ele vem pré-renderizado no HTML, e esperar a animação atrasaria a primeira pintura. As baselines visuais são capturadas com movimento reduzido.
- Login/cadastro: modal sobre a página atual no desktop (ver Sessão). Fechar (X, Esc ou "Voltar" na tela cheia mobile, que não tem botão no frame) volta à página anterior, ou ao início sem histórico. Antes ia para o `redirect`, e uma rota privada mandava de volta ao login. Alternar entre Entrar e Criar conta substitui a entrada do histórico.
- O carrossel do hero e a seção de destaques tinham o mesmo nome acessível ("Destaques da Kurio"); a segunda passou a "Lançamentos e curadoria".
- Carga direta de uma página (exceto a inicial, que vem pré-renderizada): a primeira tela espera os dados da rota por até 1 s e aparece já completa, sem skeleton piscando. Se demorar mais, o skeleton aparece. Na navegação dentro do app, o skeleton continua aparecendo após 150 ms.
- Página inicial: o HTML pré-renderizado aparece antes do JavaScript. Até a hidratação (algumas centenas de milissegundos numa rede lenta), links e âncoras funcionam como links comuns; filtros, busca e carrossel respondem depois.
- Larguras intermediárias (não há frame de tablet): o rodapé só fica em uma linha, como no frame de 1440 px, a partir de 1280 px; abaixo disso, destaques e links usam a grade de três colunas, com a newsletter e as redes embaixo, e as alturas se ajustam ao conteúdo. O formulário do perfil usa duas colunas a partir de 1024 px (ao lado da sidebar, em 768 px, cada coluna teria 177 px). No recibo, o nome do NFT é truncado e o botão do explorador quebra a linha nas telas estreitas. O `responsive.spec.ts` verifica todas as telas de 320 a 1440 px, incluindo as larguras de uma janela de 1280 px com zoom de 200% e 400%.
- Paddings simétricos no botão "Enviar" da newsletter e no selo de carteiras compatíveis (no Figma o lado direito é menor); o copyright tem o mesmo espaçamento acima e abaixo.

## Limitações

- Backend, pagamento, conexão de carteira e hash de transação são simulados; nenhuma transação real acontece.
- Os dados do mock vivem no `localStorage` de cada navegador; não há compartilhamento entre dispositivos.
- Sessão por token em `localStorage` (ver Sessão).
- Baselines visuais para Windows e Linux; em macOS precisam ser geradas localmente.
- Só a página inicial é pré-renderizada, e só no estado deslogado e sem parâmetros na URL (é o que o HTML estático consegue representar). Com sessão salva, filtros na URL ou em outras rotas, o app renderiza no navegador como uma SPA.
