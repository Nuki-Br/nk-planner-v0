# Precificação — regras de negócio

> **Etapa 3** do fluxo (Catálogo → Tipologias → **Construtor de Preço** → Publicação).
> Onde o custo vira preço: custo base por empreendimento, rascunho livre por aplicação e um
> ato explícito de publicação que congela o que vale.
>
> Documento de regras de negócio — foco em *o que* o módulo faz e nas entidades. Termos e
> textos de tela em PT-BR verbatim.

---

## 1. As três camadas

O erro que este módulo corrige era de responsabilidade: o custo morava no catálogo (org-wide),
o preço final não era gravado em lugar nenhum, e "Publicar orçamento" não publicava preço.
Agora existem três camadas, cada uma com um dono:

| Camada | Entidade | Escopo | Quem edita |
|---|---|---|---|
| **Template** | `BaseMaterial` | Organização | Catálogo — só identidade, nunca preço |
| **Custo base** | `EnterpriseMaterialCost` | Empreendimento × BaseMaterial | Aba "Custos base" e portal do terceiro |
| **Composição** | `MaterialCompositionItem` + `BaseMaterial.CostQuantity` | Organização (catálogo) | Painel da linha na aba "Custos base" |
| **Insumo (item de custo)** | `CostItem` + `EnterpriseCostItemPrice` | Org (identidade) × Empreendimento (preço) | Aba "Itens de custo" e painel de composição |
| **Rascunho de preço** | `MaterialPricing` | Aplicação (1:1 com `Material`) | Aba "Preço final", livremente |
| **Preço publicado** | `Material` (`PriceInCents` + snapshot) | Aplicação | Só o "Publicar orçamento" |

**BaseMaterial é template.** Código, nome, fabricante, categoria, unidade, tipo, mídia. Reusável
em qualquer ambiente de qualquer empreendimento. **Não tem custo**: o mesmo porcelanato custa
diferente em obras diferentes, e o catálogo é compartilhado pela organização inteira.

**Material é a aplicação.** Um `BaseMaterial` aplicado num `RoomComponent` de um `Room`. É a linha
que aparece na tabela do Construtor de Preço, e é onde o preço publicado mora.

---

## 2. Custo base — por empreendimento, com composição

O custo base de um `BaseMaterial` dentro de **um** empreendimento é:

```
custo base = custoMat × custoQtd + custoMO + Σ (qtd do insumo × preço do insumo)
```

- **`custoMat` / `custoMO`** (`EnterpriseMaterialCost`) — o custo "cheio" que as incorporadoras sem
  construtora recebem. Compartilhado por todas as aplicações do material ali: preencher o porcelanato
  uma vez vale para a Sala, o Quarto e o Hall.
- **`custoQtd`** (`BaseMaterial.CostQuantity`, catálogo) — quantitativo do **próprio material** por
  unidade: 1,2 = 20 % de quebra. Padrão 1.
- **Composição** (`MaterialCompositionItem`, catálogo) — linhas de **insumo × quantitativo** por
  unidade do material: argamassa 8 kg/m², rejunte 0,07 kg/m², assentamento 1 m²/m²… É a planilha da
  construtora (`Comp PER`). Vale para **todos** os empreendimentos, como a composição de um kit.
- **Insumo** (`CostItem`) — item de custo do catálogo da org (código, nome, unidade): material
  auxiliar, serviço/MO ou frete. O **preço** é por empreendimento (`EnterpriseCostItemPrice`) e é
  **compartilhado por todas as composições** daquele empreendimento — editar o preço da argamassa
  muda o custo de todo porcelanato que a usa.

**Pendência.** Custo de material **`NULL`** (nunca preenchido) *ou* **qualquer insumo da composição
sem preço** neste empreendimento. Um material com mão de obra preenchida e material vazio segue
pendente. `0` **não** é pendente: é "sem custo" marcado de propósito (só para material sem
composição). Uma linha pendente **sai dos totais** do orçamento (o rodapé conta quantas).

**Origens da lista "Custos base"**, de-duplicadas por material: **opções de componente** e
**sub-itens de kit** (o kit não tem custo próprio — quem tem é o material filho; a unidade exibida é
a do sub-item). Os insumos não
viram linha aqui: entram por dentro do material que os usa e têm a própria aba.

**Aba "Itens de custo"** (3º segmento do Construtor de Preço): lista editável dos insumos da org
com o preço deste empreendimento e "usado em N materiais". Remover um insumo o tira de todas as
composições (a tela confirma). A grade **"Adicionar itens"** cadastra vários de uma vez — item
existente (autocompleta e trava código/nome/unidade) ou novo — e aceita **colar do Excel** (Cód,
Nome, Unidade, Qtd, Valor).

**Painel de composição** (linha expandida na aba "Custos base"): a planilha da construtora por
material — primeira linha é o próprio material (× `custoQtd`), depois cada insumo (qtd e preço
editáveis inline), mão de obra e o total. **"Aplicar composição em…"** copia a composição para
outros materiais da mesma categoria (substituir ou mesclar), ajustando só os quantitativos.

- O **portal do terceiro** grava `custoMat`/`custoMO`, não no catálogo: o link é sempre de um
  empreendimento, e o preço que a construtora daquela obra informou não vale para as outras obras da
  incorporadora. Preço de insumo é preenchido dentro do app.

---

## 3. Rascunho — `MaterialPricing`

Uma linha por `Material`. Tudo é **override**: `NULL` = herda a fonte padrão.

| Campo | Herda de | O que a UI mostra |
|---|---|---|
| `valorUnitario` | custo base do empreendimento | coluna **Valor un.**, editável ao clique |
| `qtd` | quantidade da planta (`BlueprintRoomComponent`) | coluna **Qtd c/ RT**, popover |
| `rt` | reserva técnica da planta | idem, no mesmo popover |
| `unidade` | unidade do componente (`RoomComponent`) | idem |
| `colunas` | expressão da coluna livre | células das colunas configuráveis |

**Valor un. é o custo final, não o par mat/MO.** Quem precisa separar material de mão de obra usa a
aba "Custos base"; aqui o caso de uso é "esta aplicação específica sai por X". Um valor digitado
direto na tabela **resolve a pendência** — preço digitado é preço.

**Campo vazio volta a herdar**, não vira "custo zero". Zerar de verdade é trabalho da aba
"Custos base".

**Kit não tem `valorUnitario` editável**: o custo é a soma dos sub-itens, cada um com seu custo
base. Sobrescrever ali esconderia a conta. Qtd, RT e unidade continuam sobrescritíveis.

### Kits: sub-itens, RT e crédito

```
débito do kit  = Σ custo base do sub-item × qtd líquida do sub-item × (1 + RT do kit)
crédito (kit padrão) = Σ custo base do sub-item × qtd líquida do sub-item
```

- **Quantidade do sub-item** — líquida e **por planta** (`MaterialKitUsage`), editada na sub-linha
  do kit na aba "Preço final" (vale só para a tipologia da aba). Sem gravação, **herda a quantidade
  do kit** (override da aplicação ?? qtd do componente) quando a unidade do sub-item é a mesma;
  com outra unidade fica **"sem quantidade"**. `0` gravado é valor legítimo.
- **Pendência do kit** — sub-item sem custo base **ou** sem quantidade: a linha sai dos totais e da
  publicação. O popover de custo da sub-linha grava o custo base do material filho.
- **Qtd/RT/unidade da linha do kit** — override da aplicação (vale em todas as tipologias): a qtd e
  a unidade são o que os sub-itens de mesma unidade herdam; a RT incide sobre todos no débito.
- **Kit padrão** — linha na seção de padrão com o crédito acima; credita tanto upgrades de kit
  quanto de material.
- **Ambiente compartilhado** — o preço publicado usa as quantidades de sub-item da primeira
  tipologia; se diferirem entre tipologias, o diff avisa.

### ⭐ O override vale em TODAS as tipologias

Um ambiente compartilhado entre tipologias compartilha **tudo, inclusive preço**. Editar o preço de
um material pela aba de qualquer tipologia muda para todas as tipologias que usam aquele ambiente —
é a mesma referência, não uma cópia por planta.

Consequência: **`MaterialPricing.qtd`, quando preenchido, vence a quantidade por planta em todas as
plantas.** A quantidade por tipologia (`BlueprintRoomComponent`) continua sendo o valor **herdado**;
o override é a exceção deliberada. O popover avisa isso na tela.

Se um ambiente compartilhado tem quantidades diferentes por planta e **nenhum** override, a
publicação usa a quantidade da tipologia de menor ordem e **avisa no diff** — preencher o override
elimina a ambiguidade.

---

## 4. Publicado — `Material`

`Material.PriceInCents` (o "Total final" congelado) + `PublishedSnapshot` (valor unitário, qtd, RT,
unidade e colunas **resolvidos** no instante da publicação) + `PublishedAt` + a versão que congelou.

**O publicado não deriva de mais nada.** Mexer no custo base, na fórmula de uma coluna ou na
quantidade depois de publicar **não move** o preço publicado — até a próxima publicação. É essa
garantia que permite editar o rascunho à vontade sem medo.

`NULL` = nunca publicado (distinto de "publicado por R$ 0,00").

Só as opções **ofertáveis** (não-padrão) são publicadas: o material padrão é crédito, não preço de
venda.

---

## 5. Publicar orçamento

Botão do Construtor de Preço. Dois passos num ato só:

1. **Diff** — o modal lista o que vai mudar antes de confirmar: linhas **novas**, **alteradas**
   (`de → para`), e as que **saem do orçamento** (deixaram de ser calculáveis porque o custo sumiu;
   publicar **limpa** o preço delas). Mais os avisos de ambiente compartilhado.
2. **Confirmar** — cria a `BudgetVersion` (com o resumo digitado) e grava o preço + snapshot em cada
   `Material`.

O diff é calculado **no servidor**, percorrendo o mesmo resolvedor que a publicação usa: o que o
modal promete é o que o publish grava. Cada linha alterada traz os **motivos** — os campos do
snapshot que mudaram (valor unitário, qtd, RT, unidade, crédito do padrão, colunas livres).

### Histórico de versões

A publicação grava o **mesmo diff** no Json da `BudgetVersion` (`Changes.precos` + `avisos`), e o
drawer "Histórico de versões" o exibe agrupado em *saíram do orçamento / alterados / novos*. Diff e
lógica de leitura vivem em `lib/server/pricingDiff.ts` (puro, testado).

Versões publicadas antes de 2026-09-24 não guardaram o diff (`precos` ausente) e o preço de então
foi sobrescrito no `Material` — não há como reconstruí-lo; a tela diz isso em vez de mostrar
"nenhuma alteração". O crédito do padrão só entra nos motivos quando os dois snapshots o têm
(passou a ser gravado na mesma data).

### Badge de status

No topo da aba, ao lado do alternador Preço final | Custos base | Itens de custo:

| Estado | Quando |
|---|---|
| cinza **"Nunca publicado"** | nenhuma aplicação tem preço publicado |
| verde **"Publicado · v3"** | o rascunho está idêntico ao publicado |
| âmbar **"N alterações não publicadas"** | há diff — clicável, abre o modal |

### "Publicar orçamento" ≠ "Concluir planejamento"

São marcos diferentes, de propósito:

- **Publicar orçamento** (Construtor de Preço) congela os preços. Pode acontecer N vezes.
- **Concluir planejamento** (tela de Publicação) marca o empreendimento como `publicado` e avisa a
  Nuki. Não bloqueia edição.

A tela de Publicação mostra mín./máx. a partir do **preço publicado** — o que já está valendo —, não
de um recálculo do rascunho.

---

## 6. Cadeia de resolução (fonte única)

Tela, motor de cálculo e publicação leem pelo mesmo resolvedor, para que o preço mostrado, o preço
somado e o preço publicado nunca divirjam:

```
custo base     → custoMat × custoQtd + custoMO + Σ(qtd × preço do insumo)   (shared/utils/custoBase.ts)
valor unitário → MaterialPricing.valorUnitario ?? custo base do empreendimento
quantidade     → MaterialPricing.qtd            ?? quantidade da planta
reserva téc.   → MaterialPricing.rt             ?? RT da planta
unidade        → MaterialPricing.unidade        ?? unidade do componente
célula livre   → MaterialPricing.colunas[colId] ?? expressão da coluna
pendente       → custoMat NULL ou insumo sem preço (override de valor un. > 0 resolve)
```

O motor de cálculo não conhece catálogo, custo base nem override: recebe tudo resolvido e só faz
aritmética e fórmulas. A linha de opção no "Preço final" expande para mostrar a composição
(material × qtd, insumos, MO) **somente leitura** — a autoria é na aba "Custos base".

---

## 7. O que mudou em relação à versão anterior

| Antes | Agora |
|---|---|
| Custo em `BaseMaterial` (org-wide) | `EnterpriseMaterialCost` (por empreendimento) |
| Custos digitados viviam em `useState` e sumiam no reload | Persistidos no servidor |
| Overrides de célula viviam em `useState` e sumiam no reload | `MaterialPricing.colunas` |
| `Material.PriceInCents` existia e nunca era escrito | É o preço publicado |
| "Publicar orçamento" só criava um rótulo de versão | Congela preço + snapshot + versão |
| Aba "Custos base" repetia o material por tipologia/ambiente | Lista plana por empreendimento |
| Quantidade só editável na tela de tipologias | Override na aba "Preço final" |
| Tela `/revisao-custos` duplicava a grade de custo | Removida |
| Catálogo e importação CSV pediam custo | Só identidade |
| Itens de custo "satélites" presos ao componente da tipologia (espelho/fixo, padrão/upgrade) e registro avulso do ambiente | **Composição no material do catálogo** + insumos com preço por empreendimento (2026-09-23) |
| Quebra do material só via RT da tipologia (multiplica material e MO) | Quantitativo do próprio material na composição (`custoQtd`, ex.: 1,2) |
| Item de custo adicionado um a um por modal | Grade multi-linha com colar do Excel + "Aplicar composição em…" |
