# Tipologias — regras de negócio

> **Etapa 2** do fluxo. Onde se define, por empreendimento, o **esqueleto de personalização** —
> a árvore **Tipologia → Ambiente → Componente** — que o Construtor de Preço precifica.
>
> Documento de regras de negócio para a nova versão. Termos, campos e textos de tela em PT-BR
> verbatim.

---

## 1. Propósito e papel no fluxo

A tela lista as **tipologias** (variações de planta) do empreendimento à esquerda e, à direita, um
acordeão **Ambientes → Componentes**. O usuário monta a árvore; cada componente recebe depois sua
**paleta de materiais** (padrão + upgrades) na tela adjacente de Materiais-config. Essa árvore é a
fonte que o Construtor de Preço lê para calcular custo e preço. O **custo** de cada material
(composição de insumos) **não** é da tipologia — mora no catálogo e no empreendimento (ver
`docs/features/pricing.md` §2).

---

## 2. Entidades e conceitos-chave

### ⭐ O conceito central: **compartilhado × por-tipologia**

É a mecânica mais importante (e mais delicada) do módulo. Um **Ambiente pertence ao
empreendimento, não à tipologia** — logo pode ser **compartilhado** entre várias tipologias. A
**definição e a paleta** de um componente também são compartilhadas; **só a quantidade e a reserva
técnica (RT) são por tipologia**.

| O que é **compartilhado** (muda em todas as tipologias que usam o ambiente) | O que é **por-tipologia** (independente em cada uma) |
|---|---|
| Ambiente: **nome, ícone** | Ambiente: **local na planta** (posição/polígono) |
| Componente: **nome, unidade, ordem, ghost** | Componente: **quantidade (qtd), reserva técnica (rt)** |
| Componente: **paleta inteira** (padrão + upgrades) | Quantidades de sub-itens de kit |

Consequência prática: editar o nome/unidade de um componente compartilhado, ou mexer na paleta,
**muda silenciosamente em todas as outras tipologias**. A única "válvula de escape" por-tipologia
num componente compartilhado é **qtd/RT**.

> **Atenção (precificação, 2026-07-23):** o **preço** não segue esta tabela — ele é **um só por
> material aplicado**, compartilhado entre as tipologias. E o override de **qtd/RT/unidade** feito
> na aba "Preço final" do Construtor de Preço **vence a qtd por-tipologia em todas as plantas**.
> A qtd definida aqui continua sendo o valor **herdado**, usado enquanto não houver override.
> Ver `docs/features/pricing.md`.

### Tipologia
Variação de planta, do empreendimento. Campos: `nome`, `descricao`, `metragem`, `unidades`,
`status` (`completa | incompleta`), `ambientes[]`.
- `metragem` e `unidades` **nascem 0** e saíram da interface de criação.

### Ambiente
Um cômodo. Pertence ao empreendimento (compartilhável). Campos: `nome`, `icon` (compartilhados),
`local` (por-tipologia), `componentes[]`.
- **Não tem imagem** — no Planner a única entidade com imagem é o material.
- `local` (posição na planta) hoje só é escrito pelo Visualizador (canvas).

### Componente
Um ponto de personalização (ex.: Piso, Rodapé). Campos compartilhados: `nome`, `unidade`,
`padrao`, `options[]`, `ghost`, `ordem`. Campos por-tipologia: `qtd`, `rt`, quantidades de kit.
- **RT (reserva técnica) é percentual:** `qtdComRT = qtd × (1 + rt/100)`.
- **Nasce sem paleta** — o material padrão é escolhido depois, na tela de Materiais-config.

### Opção (material do componente)
Cada linha da paleta: um material do catálogo ofertado no componente. Campos: material, `isKit`,
`isDefault`, `ordem`.
- **Exatamente uma opção é a padrão** (o **lado crédito** do cálculo); toda outra é um **upgrade**
  (o **lado débito**).
- Um material do catálogo só pode ser opção **uma vez por componente**.

### Ghost / "fantasma"
Flag no componente. **Hoje é só um selo visual, sem efeito** — nenhum botão o liga e nada a
jusante (nem o cálculo, nem a personalização) o lê. Significado pretendido (por convenção): um
componente que existe estruturalmente mas **não é ofertado** ao cliente. Está meio-implementado
(ver §7).

### Custo do material — não é da tipologia (desde 2026-09-23)
Os antigos "itens de custo" presos ao componente (satélites espelho/fixo) e os "registros" de
ambiente **foram removidos**. Soleira, rodapé, argamassa, rejunte, assentamento etc. são a
**composição** do material no catálogo (insumo × quantitativo), com preço de insumo por
empreendimento; piso + rodapé + soleira ofertados juntos é **kit**. Nada disso vive na árvore da
tipologia — ver `docs/features/pricing.md` §2.

---

## 3. Fluxos do usuário

### Tipologia
- **Criar** — exige só o `nome`. Nasce `incompleta`, com `metragem/unidades = 0`. *Atenção:* os
  campos quartos/suítes, "características da planta" e "grupos" do modal são **mock local — não são
  persistidos**.
- **Editar** — só `nome` e `descricao` persistem. Quartos/suítes são **derivados por regex** dos
  nomes dos ambientes, só para exibição.
- **Editar metragens** (menu ▾ do "Editar") — `qtd`/`rt` de **todos** os componentes da tipologia
  numa tabela por ambiente, gravados num request só (`PATCH /api/tipologias/[id]/metragens`, um
  `INSERT … ON CONFLICT` em `BlueprintRoomComponent`). Por planta, como no "Editar" do
  componente: ambiente compartilhado não muda nas outras tipologias. Unidade não entra (é da
  paleta, compartilhada). Enter/↓ desce de linha; colar do Excel preenche a coluna (Qtd, ou Qtd e
  RT) a partir da célula focada.
- **Duplicar** — **cópia profunda e totalmente independente** (`"{nome} (cópia)"`): clona todos os
  ambientes em **novos** rooms/componentes/opções. **Ambientes
  compartilhados na origem viram independentes na cópia** (o compartilhamento não é preservado).
- **Excluir** — remove a tipologia; depois limpa **apenas os ambientes órfãos** (um ambiente ainda
  usado por outra tipologia sobrevive).

### Ambiente
- **Adicionar** — dois caminhos:
  1. **Criar novo** — exige nome (vazio vira "Novo ambiente"); ícone escolhido (23 opções) ou
     auto-sugerido pelo nome. Cria um ambiente novo do empreendimento e o vincula à tipologia.
  2. **Vincular de outra tipologia** — ver abaixo.
- **Editar** — `nome`/`icon` escrevem no ambiente (**compartilhado** → propaga a todas as
  plantas); `local` é por-tipologia.
- **Clonar** — cópia **independente** dentro da mesma tipologia (`"{nome} (cópia)"`); a paleta é
  clonada, **não** compartilhada.
- **Excluir** — remove esta aparição do ambiente; se o ambiente **não estiver em nenhuma outra
  tipologia**, o ambiente some junto. Ou seja, excluir uma aparição de um ambiente compartilhado só
  o **desvincula**. O aviso de confirmação diz que os componentes serão removidos.
- **Reordenar** — arrasto; valida que o conjunto de ids bate, senão "Ordem de ambientes inválida."

#### Vincular (compartilhar um ambiente) — a mecânica crítica
Lista ambientes das **outras** tipologias; escolher um:
- Insere uma nova aparição apontando para o **mesmo** ambiente (**não** clona).
- **Copia qtd/RT da origem** para a nova planta (a partir daí, cada uma segue independente).
- A paleta é **compartilhada por construção — nada é copiado**.
- **Trava:** um ambiente não pode ser vinculado duas vezes na mesma tipologia → "Ambiente já
  compartilhado nesta tipologia." (o modal também desabilita os já vinculados).
- Um ambiente presente em ≥2 tipologias ganha o selo roxo **"Compartilhado"** + a lista das outras
  tipologias.

### Componente
- **Adicionar** — exige nome; unidade (padrão `m²`), qtd, RT (placeholder 15). **Instancia o
  componente em TODAS as aparições do ambiente**, com a mesma qtd/RT inicial (adicionar num
  ambiente compartilhado adiciona em todas as plantas de uma vez). Nasce sem paleta.
- **Editar** — `nome`/`unidade`/`ghost`/`ordem` são **compartilhados** (todas as plantas);
  `qtd`/`rt` mexem **só nesta planta**.
- **Excluir** — remove o componente **inteiro** → sai de **todas** as plantas que compartilham o
  ambiente. (O aviso de confirmação **não** menciona esse efeito compartilhado.)
- **Reordenar** — a ordem é **compartilhada** entre plantas.

### Opções (padrão / upgrade) — na tela adjacente de Materiais-config
Não acontecem nesta tela. Lá se define o material **padrão**, adiciona/remove/troca **upgrades** e
ajusta quantidades de sub-itens de kit por planta. (Detalhado no spec de Materiais-config.)

---

## 4. Regras de negócio

- **Split compartilhado/por-tipologia** — ver a tabela em §2. É a regra que rege quase tudo.
- **Propagação:** editar qualquer coisa compartilhada muda em todas as tipologias que usam o
  ambiente. Adicionar um componente o instancia em todas as aparições do ambiente.
- **Unicidade que o usuário encontra:** um ambiente por tipologia; um material por opção por
  componente; uma instância de componente por (planta, componente).
- **Cascatas que importam:**
  - Excluir tipologia → limpa ambientes órfãos; ambientes compartilhados sobrevivem.
  - Excluir ambiente → desvincula; o ambiente só morre quando não resta nenhuma aparição.
  - Excluir componente → é global (todas as plantas).
- **Ordenação:** todos os níveis têm ordem explícita; reordenar valida que o conjunto de ids bate.
- **Custo pendente** (material NULL ou insumo sem preço, por empreendimento) — a pendência é mostrada
  no Construtor de Preço, **não aqui**.
- **Escopo por organização** — beta orgs isoladas.

---

## 5. Estados e casos de borda

- **Vazios:** "Nenhuma tipologia ainda" / sem ambientes / sem componentes, cada um com seu CTA.
- **Efeitos colaterais de compartilhamento (os riscos):**
  - Editar nome/unidade ou paleta de um componente compartilhado muda em **todas** as outras
    tipologias — **silenciosamente**.
  - Excluir um componente compartilhado o remove de todas as plantas; o aviso não diz isso.
  - Excluir uma aparição de ambiente compartilhado só desvincula (o ambiente persiste).
  - qtd/RT é a **única** diferença por-planta possível num componente compartilhado.
- **`status` é inerte aqui** — o selo reflete um valor guardado que nada nesta tela altera (ver §7).
- **Pendentes não aparecem aqui** — a pendência vive no Construtor de Preço.
- **Seleção inicial** cai na 2ª tipologia da lista ("Planta B", herança do protótipo) — não é
  regra, é resíduo.

---

## 6. Fronteiras (onde Tipologias termina)

- **Visualizador / Canvas** (`/tipologias/[id]/canvas`) — dono do **local na planta**
  (posição/polígono) do ambiente. Não faz o CRUD da árvore.
- **Materiais-config** (`/tipologias/[id]/componente/[cid]`) — editor da **paleta** do componente
  (padrão, upgrades, quantidades de kit). Tipologias só cria a "casca" do componente
  (nome/unidade/qtd/RT) e linka via "Configurar →".
- **Composição de custo** — **decidido em 2026-09-23:** mora no **material do catálogo**
  (insumo × quantitativo) e é editada na aba "Custos base" do Construtor de Preço; os preços dos
  insumos, na aba "Itens de custo". Tipologias não tem linha de custo nenhuma.

---

## 7. Questões em aberto (decidir na nova versão)

1. **Regra de "completa":** o que torna uma tipologia `completa`? **Não existe regra no
   comportamento atual** — nada deriva nem escreve o status; só o seed/uso manual define. A tela
   mostra, à parte, um progresso "N/N componentes configurados" (componentes com ao menos um
   upgrade) que **não** alimenta o selo de status.
2. **Ghost/"fantasma":** o que ele deve fazer (na precificação e na personalização) e como é
   ligado? Hoje presente estruturalmente, ausente no comportamento.
3. **UX de edição compartilhada:** editar/excluir um componente compartilhado deveria **avisar** (ou
   permitir escopar) o impacto cross-tipologia? Hoje é mutação global silenciosa.
4. **Kits aninhados** (questão #3 do produto): kits podem conter outros kits? Alto impacto na
   profundidade do modelo — em aberto.
5. **Sincronização de ambiente compartilhado** (questão #7): hoje compartilha nome/ícone + paleta,
   mantém `local` por-planta e **copia** qtd/RT no momento do vínculo. É esse o comportamento
   desejado?
6. **Semântica de "Duplicar":** duplicar tipologia **quebra todo compartilhamento** (cópia
   profunda). É o esperado, ou ambientes compartilhados deveriam continuar compartilhados na cópia?
7. **Campos mock:** quartos/suítes, "características da planta" e "grupos" nos modais **não
   persistem**. Implementar de verdade ou remover na nova versão?
