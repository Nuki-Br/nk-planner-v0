# Decisões & questões em aberto

## Decisões travadas (Fase 0, 2026-07-04)
| Tema | Decisão |
|------|---------|
| UI | **HeroUI + Tailwind**, espelhando tokens/padrões do `nk-admin-portal`. |
| Colaboração em tempo real | **Adiada.** Canvas com presença, post-its e threads de comentário entram como local/single-user no MVP; Supabase Realtime numa fase posterior. |
| Multi-tenancy | **Org-scoped simples.** Usuários e empreendimentos pertencem a uma organização; orgs de beta não veem dados umas das outras. Sem multi-tenant pesado. |
| Linguagem/tipos | TypeScript estrito, **sem `any`/`unknown`** (exceto `catch`). Prisma como ORM. |
| Banco/Auth | Supabase Postgres + Supabase Auth (`@supabase/ssr`). |
| Localização do projeto | `Lab/nk-planner-v0` (irmão do protótipo `Nuki-Planner-v1`). |

## Questões em aberto (do módulo doc §7 — resolver quando pesarem)
| # | Questão | Impacto | Resolver em |
|---|---------|---------|-------------|
| 1 | Terceiro vê histórico de revisões dos valores que preencheu? | Médio | Fase 3 |
| 2 | Controle de acesso granular dentro da incorporadora (ex.: só financeiro vê taxas)? | Médio | Fase 5 |
| 3 | Kits podem conter outros kits (aninhados)? | Alto (profundidade do modelo) | Fase 5 |
| 4 | O preço exportado p/ fase 02 é sempre "Total final" arredondado, ou coluna escolhível? | Médio | Fase 3/5 |
| 5 | Post-its têm resolução/encadeamento ou são notas livres? | Médio | Fase 3 |
| 6 | Senha do link substitui ou complementa a verificação por e-mail? | Baixo | Fase 5 |
| 7 | Ambientes compartilhados sincronizam imagem base e local na planta, ou só componentes? | Médio | Fase 3 |
