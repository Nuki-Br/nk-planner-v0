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
| Custos no cadastro de material | **Sem custos no modal** (fiel ao protótipo): só identificação (código, categoria, especificação, fabricante, unidade). ⚠️ *Superada em 2026-07-23 (ver bloco Precificação): o material não tem mais campo de custo nenhum — o custo é por empreendimento, e a pendência também.* |
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

## Decisões travadas (Precificação, 2026-07-23)
Split de responsabilidades entre catálogo, custo e preço. Regras completas em
`docs/features/pricing.md`.

| Tema | Decisão |
|------|---------|
| **Granularidade do preço** | **Uma referência por Material (a aplicação), não por tipologia.** Ambiente compartilhado compartilha *tudo*, inclusive preço: editar o preço pela aba de qualquer tipologia muda para todas que usam aquele ambiente. Não existe versão de preço por planta. |
| **Rascunho × publicado** | Rascunho em **`MaterialPricing`** (1:1 com `Material`, editável à vontade); publicado no próprio **`Material`** (`PriceInCents` + `PublishedSnapshot` congelados). O diff é a comparação dos dois; o histórico segue no JSON de `BudgetVersion`. Mexer no custo base depois de publicar **não** move o preço publicado. |
| **Custo no catálogo** | **Dropadas** `BaseMaterial.CostMaterialInCents`/`CostLaborInCents`. O `BaseMaterial` vira template puro (identidade); o custo passa a ser **por empreendimento** (`EnterpriseMaterialCost`), porque o mesmo material custa diferente em obras diferentes. Catálogo e importação CSV deixam de pedir custo, e o portal do terceiro grava no custo do empreendimento. |
| **Override de qtd/RT/unidade** | Editáveis na aba "Preço final" e, quando preenchidos, **vencem `BlueprintRoomComponent`/`RoomComponent` em TODAS as tipologias** — coerente com a decisão de granularidade. A qtd por planta continua sendo o valor herdado. Ambiente compartilhado com qtds diferentes e sem override publica pela tipologia de menor ordem, avisando no diff. |
| **Revisão de custos** | Tela `/revisao-custos` e o feature `cost-review` **removidos** — redundantes com a aba "Custos base", que passou a ser por empreendimento (lista plana e de-duplicada) em vez de por tipologia. `EditableCell` e `features/budget/enumerate.ts` foram junto (sem consumidores). |
| **Publicar × concluir** | Continuam sendo **marcos separados**: "Publicar orçamento" (Construtor de Preço) congela preços e pode acontecer N vezes; "Concluir planejamento" (tela de Publicação) marca o empreendimento como `publicado` e avisa a Nuki. |
| **Onde o diff é calculado** | **No servidor** (`lib/server/pricing.ts`), percorrendo o mesmo resolvedor que a publicação usa — o que o modal promete é o que o publish grava. |

## Decisões travadas (Material sem custo, 2026-09-23)
Caso motivador: padrão "Não entregue" — nada é entregue no padrão, mas há upgrades.

| Tema | Decisão |
|------|---------|
| **Três estados do custo** | `EnterpriseMaterialCost.CostMaterialInCents`: **NULL = pendente** (nunca preenchido), **0 = "sem custo"** (zero decidido), **> 0 = com custo**. No domínio, `CustoBase.custoMat: number \| null`. Só "pendente" trava opções/upgrades. |
| **Onde marcar** | **Por empreendimento**, na aba "Custos base" (e no atalho da linha de padrão em "Preço final"). Sem flag no catálogo. |
| **Como marcar** | **Ação explícita "Sem custo"** — digitar 0 ou limpar o campo volta a *pendente*, para um zero acidental não virar material grátis. "Desfazer" volta a pendente. Linha com custo real não oferece a ação (limpar antes). |
| **Padrão pendente** | O motor credita um padrão pendente como zero; como agora existe "sem custo", isso é tratado como esquecimento: **aviso** (não bloqueio) no modal "Publicar orçamento" e no checklist da Publicação. Sem débito/crédito, não avisa. |
| **Preço negativo** | **Travado em zero**: `custo_troca = max(0, débito − crédito)` e o total da linha também nunca fica negativo. Vale para qualquer upgrade mais barato que o padrão, não só os "sem custo". |
| **Portal do terceiro** | Materiais "sem custo" **somem** do portal e o envio do terceiro os ignora (não sobrescreve a decisão). |

## Decisões travadas (Composição de custo, 2026-09-23)
Caso motivador: incorporadora **com** construtora (BIOOS) custeia cada material como
composição de insumos (planilha `insumo-EX` + `Comp PER`): porcelanato 1,2 m² × 98,45 +
argamassa 8 kg × 1,64 + rejunte 0,07 kg × 10,05 + … + assentamento 1 × 106,88. As
incorporadoras sem construtora seguem recebendo o custo "cheio" (mat + MO) — os dois
casos convivem na mesma fórmula.

| Tema | Decisão |
|------|---------|
| **Onde vive o item de custo** | **No material, não na tipologia.** O "item de custo" vira um **insumo** (`CostItem`: código, nome, unidade) do catálogo da org, e a **composição** (`MaterialCompositionItem`: insumo × quantitativo por unidade) fica no `BaseMaterial` — vale para todos os empreendimentos, como os kits. |
| **Preço do insumo** | **Por empreendimento** (`EnterpriseCostItemPrice`, NULL = pendente), coerente com a decisão de 23/07 (custo é por obra). Edita-se na aba **"Itens de custo"** (3º segmento do Construtor de Preço) ou inline no painel de composição da aba "Custos base"; o preço é compartilhado por todas as composições daquele empreendimento. |
| **Quantitativo do material** | `BaseMaterial.CostQuantity` (padrão 1): a primeira linha da composição é o próprio material (1,2 = 20 % de quebra). A RT por tipologia continua existindo e multiplica o valor unitário inteiro. |
| **Fórmula** | `custo base = custoMat × custoQtd + custoMO + Σ(qtd × preço do insumo)` — única implementação em `src/shared/utils/custoBase.ts`, usada pela aba, pelo motor e pela publicação. |
| **Pendência** | Custo de material **NULL** *ou* **qualquer insumo sem preço** neste empreendimento. "Sem custo" (0 marcado) só vale para material **sem** composição. Um override de "Valor un." > 0 continua resolvendo a pendência. |
| **Satélites e registros removidos** | `RoomComponentCostItem` (espelho/fixo, padrão/upgrade, escopo por opção) e `RoomCostRegistro` **dropados sem conversão** — eram um workaround do modelo "custo cheio". Piso + rodapé + soleira é **kit** (a revisar depois). O diff mostra as linhas afetadas como "alterado" na primeira publicação depois da migration. |
| **Cadastro em lote** | Grade multi-linha "Adicionar itens" (Cód, Nome, Unidade, Qtd, Valor) que aceita item existente ou novo e **colar do Excel** (TSV). "Aplicar composição em…" copia a composição para outros materiais da mesma categoria (substituir ou mesclar), ajustando só os quantitativos. |
| **Unidades** | Lista ganha `m³ · l · vb · dia · h · sc` (planilha da construtora usa M3, VB, DIA). `normalizeUnidade` traduz grafias de planilha (M2, UN, KG…). |
| **Portal do terceiro** | Inalterado: preenche mat/MO dos materiais. Preço de insumo é preenchido dentro do app — material pendente só por insumo continua pendente após o envio do terceiro (a aba Custos base aponta "insumo sem preço"). |
| **Cascatas** | Apagar insumo → some das composições (a UI confirma "usado em N materiais"); apagar material → composição vai junto; apagar empreendimento → preços vão junto. |

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
