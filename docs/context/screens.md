# Mapa de telas do Planner

11 telas do protótipo (registradas em `../../Nuki-Planner-v1/planner/app.jsx`), com o id de
tela do protótipo, a rota alvo no NextJS e a origem no protótipo. Telas contextuais (canvas,
config de materiais, portal do terceiro) são acessadas de dentro de outras, não pela sidebar.

| # | Tela | id protótipo (`screen`) | Rota alvo | Origem no protótipo |
|---|------|-------------------------|-----------|---------------------|
| 1 | Dashboard | `dashboard` | `/dashboard` | screens-a.jsx |
| 2 | Config base | `project-setup` | `/config-base` | screens-a.jsx |
| 3 | Tipologias | `typologies` | `/tipologias` | screens-a/b.jsx |
| 4 | Visualizador (canvas) | `typology-canvas` | `/tipologias/[id]/canvas` | screens-canvas.jsx |
| 5 | Grupos de unidades | (modal) | modal em `/tipologias` | screens-unitgroups.jsx |
| 6 | Catálogo de materiais e kits | `materials-catalog` | `/catalogo` | screens-b.jsx |
| 7 | Config. de materiais por componente | `materials-config` | `/tipologias/[id]/componente/[cid]` | screens-b/c.jsx |
| 8 | ~~Revisão de custos~~ | — | — | **Removida em 2026-07-23** — virou a aba "Custos base" do Construtor de Preço (por empreendimento). Ver `docs/features/pricing.md`. |
| 9 | Portal do terceiro (link) | `builder-portal` | `/portal/[token]` (sem shell) | screens-c.jsx |
| 10 | Construtor de Preço (três visões: Preço final \| Custos base \| Itens de custo) | `budget-table` | `/orcamento` | screens-budget.jsx, screens-pricing.jsx — "Itens de custo" e o painel de composição são novos (2026-09-23, ver `docs/features/pricing.md` §2) |
| 11 | Publicação | `publish` | `/publicacao` | screens-a.jsx |

## Telas de suporte no protótipo (não migrar como tela)
- `components.jsx`, `builder-shared.jsx`, `ambiente.jsx` — componentes compartilhados.
- `tweaks-panel.jsx` — **cruft de experimentação**, remover na Fase 2.
- `data.js` — mock data → vira seed do Prisma (Fase 5).
- `tokens.js` — já portado para `tailwind.config.ts`.

## Fluxo de navegação
`dashboard → config-base → tipologias (⇄ canvas, ⇄ grupos) → catálogo → materials-config →
revisão de custos (→ portal do terceiro) → orçamento → publicação`.

## Notas de escopo do MVP
- **Colaboração em tempo real (presença, post-its, threads de comentário) = adiada.** No MVP
  essas telas são locais/single-user. Ver `docs/decisions.md`.
- Recálculo do orçamento é **client-side em tempo real** (sem API) — hook dedicado na Fase 4.
