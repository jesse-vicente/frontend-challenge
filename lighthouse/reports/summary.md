# Lighthouse — mediana de 3 execuções

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| inicio | mobile | **66** ⚠ | 100 | 100 | 100 | 4.78 s | 0.000 | 246 ms |
| inicio | desktop | 98 | 100 | 100 | 100 | 0.99 s | 0.000 | 3 ms |
| detalhe | mobile | **74** ⚠ | 100 | 100 | 100 | 4.48 s | 0.000 | 97 ms |
| detalhe | desktop | 98 | 100 | 100 | 100 | 0.95 s | 0.000 | 0 ms |

Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90.

## Ambiente

- **date**: 2026-10-23T23:50:51.630Z
- **lighthouse**: 13.5.0
- **browser**: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36
- **node**: v24.9.0
- **os**: Windows_NT 10.0.26200 (x64)
- **cpu**: Intel(R) Core(TM) i7-8750H CPU @ 2.20GHz
- **baseUrl**: http://localhost:4173
- **runsPerPage**: 3
- **conditions**: Build de produção (vite build + vite preview), cenário padrão dos mocks (MSW + Socket.IO simulado), perfil limpo a cada execução. Mobile: emulação padrão do Lighthouse com throttling simulado; desktop: preset desktop.
