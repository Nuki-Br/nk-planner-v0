# Convenções de código — nk-planner-v0

Espelham o `nk-admin-portal`. Objetivo: consistência visual e estrutural para facilitar uma
eventual reintegração e manter o código previsível para o Claude.

## TypeScript
- `strict: true` + `noUncheckedIndexedAccess`. **Sem `any`**; `unknown` só onde idiomático
  (ex.: `catch (e: unknown)`). Prefira tipos explícitos e `interface` para modelos de dados.
- Tipos de domínio compartilhados em `src/shared/types/`. Tipos de request/response de rota
  ficam junto do feature ou em `shared/types`.

## Estrutura por feature
Cada tela/feature em `src/features/<feature>/` com:
```
components/    # componentes da feature (client/server conforme necessidade)
hooks/         # lógica extraída em hooks (ex.: useBudgetTable, useFormulaEngine)
types.ts       # tipos locais da feature
```
Rotas em `src/app/(planner)/<rota>/page.tsx` compõem a feature. Páginas magras; lógica nos hooks.

## Dados
- **Estado de servidor** → React Query. Funções de acesso em `src/lib/api/*.ts` usando os
  wrappers de `src/lib/api/http.ts` (envelope `BaseResult<T>`), chamadas via hooks
  `useQuery`/`useMutation`. Query keys: `["<recurso>", ...params]`.
- **Estado local complexo** (canvas, tabela de orçamento) → `useState`/`useReducer` + context
  da feature. O recálculo do orçamento é client-side (sem API).
- Acesso ao banco no servidor via `src/lib/prisma.ts`. Auth/sessão via `src/lib/supabase/*`.

## UI
- **HeroUI** para primitivos (Button, Input, Table, Modal, Tabs, Card, Accordion...).
  Envolva/estenda em `src/components/ui/` quando precisar de variações Nuki.
- **Tailwind** com os tokens de `tailwind.config.ts`: `primary-4` (#06CECE) é a cor de marca;
  escala `neutral-gray-*`; tipografia `text-title-*`, `text-sm-p`, etc. Fonte Manrope.
- `cn()` de `src/lib/utils.ts` para compor classes.
- Ícones: `react-icons` (linha `Lu*` do Lucide, como na navegação).

## Copy (PT-BR)
- Botões no infinitivo: "Salvar", "Publicar", "Adicionar". Títulos em sentence case.
- Números no locale BR (vírgula decimal, ponto de milhar), `R$`, datas `DD/MM/AAAA`. Sem emoji.

## Rotas de API (Fase 5)
- Route handlers em `src/app/api/.../route.ts` retornando `BaseResult<T>`.
- Sempre validar org do usuário (Supabase Auth → membership → `organizationId`) e filtrar por org.
