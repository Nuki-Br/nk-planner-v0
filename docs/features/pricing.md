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
| **Rascunho de preço** | `MaterialPricing` | Aplicação (1:1 com `Material`) | Aba "Preço final", livremente |
| **Preço publicado** | `Material` (`PriceInCents` + snapshot) | Aplicação | Só o "Publicar orçamento" |

**BaseMaterial é template.** Código, nome, fabricante, categoria, unidade, tipo, mídia. Reusável
em qualquer ambiente de qualquer empreendimento. **Não tem custo**: o mesmo porcelanato custa
diferente em obras diferentes, e o catálogo é compartilhado pela organização inteira.

**Material é a aplicação.** Um `BaseMaterial` aplicado num `RoomComponent` de um `Room`. É a linha
que aparece na tabela do Construtor de Preço, e é onde o preço publicado mora.

---

## 2. Custo base — por empreendimento

`EnterpriseMaterialCost` guarda **custo de material + custo de mão de obra** de um `BaseMaterial`
dentro de **um** empreendimento. Compartilhado por todas as aplicações dele ali: preencher o
porcelanato uma vez vale para a Sala, o Quarto e o Hall.

- **`NULL` ou custo de material `0` = pendente.** A pendência olha o custo **de material**: um item
  com mão de obra preenchida e material zerado segue pendente — falta a cotação que a construtora
  precisa devolver.
- Uma linha pendente **sai dos totais** do orçamento (e o rodapé da tabela conta quantas).
- Entram na lista três origens, de-duplicadas: **opções de componente**, **sub-itens de kit** (o kit
  não tem custo próprio — quem tem é o material filho) e **itens de custo "fixo"** (satélites).
- O **portal do terceiro** grava aqui, não no catálogo: o link é sempre de um empreendimento, e o
  preço que a construtora daquela obra informou não vale para as outras obras da incorporadora.

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
modal promete é o que o publish grava.

### Badge de status

No topo da aba, ao lado do alternador Preço final ⇄ Custos base:

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
valor unitário → MaterialPricing.valorUnitario ?? custo base do empreendimento
quantidade     → MaterialPricing.qtd            ?? quantidade da planta
reserva téc.   → MaterialPricing.rt             ?? RT da planta
unidade        → MaterialPricing.unidade        ?? unidade do componente
célula livre   → MaterialPricing.colunas[colId] ?? expressão da coluna
pendente       → custo unitário efetivo ≤ 0
```

O motor de cálculo não conhece catálogo, custo base nem override: recebe tudo resolvido e só faz
aritmética e fórmulas.

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
