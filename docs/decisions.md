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

## Decisões travadas (Fase 4, 2026-07-06)
| Tema | Decisão |
|------|---------|
| Custos no cadastro de material | **Sem custos no modal** (fiel ao protótipo): só identificação (código, categoria, especificação, fabricante, unidade). Material nasce com `custoMat`/`custoMO` = 0 e conta como pendente até a Revisão de custos (Fase 8) ou o preenchimento via link. |
| Importação CSV | **Real com PapaParse**: upload de arquivo .csv, mapeamento de colunas auto-sugerido (sinônimos PT-BR), pré-visualização com linhas descartadas e motivo, gravação em lote no store. Linhas sem especificação ou com categoria desconhecida são descartadas; unidade desconhecida vira `und`; custos vazios viram 0 (pendentes). |
| Backend | **Colocalizado no Next.js** (route handlers `/api/*` + Prisma/Supabase na Fase 10). Sem repositório separado para o backend do MVP. |

## Decisões travadas (Media Center, 2026-07-15)
Port do media center do `nk-admin-portal` (referência de design/convenção, nunca dependência).
O contrato espelhado é `nk-api-customization/docs/media-center-frontend-integration.md`.

| Tema | Decisão |
|------|---------|
| **Escopo da imagem** | **Só o Material tem imagem no Planner** (`BaseMaterial.ImagePreviewUrl` + `MediaFileId`). Imagem de ambiente e de planta é assunto do **Personaliza** — corrigido em 2026-07-15 pelo user; o `product.md` afirmava o contrário e estava velho. As colunas `Room.BaseImageUrl`, `Blueprint.ImageUrl` e `BlueprintRoom.DrawnImageUrl` foram **dropadas** (auditoria confirmou 0 dados), junto com o campo "Imagem base" do AmbienteModal e a seção "Imagem da planta" do EditTypologyModal — esta última era mock morto (o `handleSave` nunca enviava a imagem). Consequência: `FileUsagesDto.blueprints`/`.rooms` vêm sempre vazios, mantidos no DTO por paridade de contrato. |
| Vínculo com entidades | **FK `MediaFileId`** em BaseMaterial, com a coluna `ImagePreviewUrl` legada mantida como fallback (`resolveMediaUrl`). Habilita o "Onde é usado?" por query de FK e preserva o contrato para uma eventual reintegração com a API de customização. |
| Storage | **Supabase Storage, bucket `media` público**, espelhando a semântica do Azure Blob do admin: `getPublicUrl()` dá URL estável e permanente, gravável em `PublicUrl` e otimizável pelo `next/image`. Isolamento pelo path `{organizationId}/{uuid}.{ext}`, não adivinhável. Escrita só via service-role ou signed upload URL → a superfície correta de policy em `storage.objects` é **vazia**. |
| Superfície | **Só modal**, sem rota `/midia` e sem entrada na sidebar — igual ao admin. Alcançável pelos pontos de imagem (ImagePickerField). |
| Otimização WebP | `PublicOptimizedUrl` existe no DTO mas fica **sempre null** no v0 — sem `sharp` (binário nativo, atrito de deploy) e sem Image Transformation (plano pago). O front já faz `optimized ?? public` e o `next/image` otimiza o grid, que é o que pesa na UX. |
| Migrations | **Baseline + migrations reais.** O banco vinha de `db push` com histórico vazio; o schema atual foi congelado como `0_init` e marcado aplicado. Daqui pra frente toda mudança é um SQL revisável e o deploy é `migrate deploy`. Feito antes do primeiro beta, enquanto ainda era barato. |

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
