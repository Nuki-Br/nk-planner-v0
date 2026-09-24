# Catálogo de materiais — regras de negócio

> **Etapa 1** do fluxo (Catálogo → Tipologias → Construtor de Preço → Publicação).
> Biblioteca de materiais, kits e categorias **por organização**, referenciada por todas as telas
> seguintes como opções de acabamento. **Cadastra identidade, não custo.**
>
> Documento de regras de negócio para a nova versão — foco em *o que* o módulo faz e nas
> entidades. Não descreve implementação (arquivos, rotas, schema). Termos, campos e textos de
> tela em PT-BR verbatim.

---

## 1. Propósito e papel no fluxo

O Catálogo é a base de tudo: cria a biblioteca de acabamentos que tipologias, canvas, orçamento,
construtor de preço e portal do terceiro consomem. Três tipos de entidade, todas **escopadas à
organização** (uma org de beta nunca vê o catálogo de outra):

- **Materiais** — itens de acabamento avulsos.
- **Kits** — agrupamentos nomeados de materiais. **Kit não tem custo próprio**: seu custo é a
  **soma dos sub-itens**.
- **Categorias** — classificação dinâmica, colorida, criada livremente pela própria org.
- **Itens de custo (insumos)** — argamassa, rejunte, assentamento, frete… que compõem o custo dos
  materiais. São do catálogo da org (código, nome, unidade), mas **geridos no Construtor de Preço**
  (aba "Itens de custo"), porque o preço é por empreendimento.

**Decisão de produto que rege o módulo:** o catálogo captura **só identidade** — código,
categoria, especificação, fabricante e imagem. **Custo (material e mão de obra) não é digitado no
cadastro** — o catálogo **não tem coluna de custo nenhuma.** O custo é **por empreendimento**
(`EnterpriseMaterialCost`), preenchido na aba **"Custos base"** do Construtor de Preço ou por
**link de preenchimento** (portal do terceiro): o mesmo porcelanato custa diferente em obras
diferentes. Quantidades por tipologia também não vivem aqui — pertencem à árvore da tipologia.
Ver `docs/features/pricing.md`.

---

## 2. Entidades e conceitos-chave

### Material (item do catálogo)
| Campo | Significado |
|---|---|
| `codigo` | Código de referência (opcional). |
| `nome` | Especificação completa do acabamento. |
| `fabricante` | Fabricante (opcional). |
| `categoria` | Nome da categoria (texto; `""` = sem categoria). |
| `imagem` | Foto/render do acabamento (via media center). Opcional. |

**Material não tem custo.** Ele é o *template*; o custo é da aplicação num empreendimento.

**Material não tem unidade de medida.** A unidade vem do **contexto de uso** (o componente da
tipologia onde o material é aplicado) ou, dentro de um kit, do sub-item.

### Kit
Agrupamento de materiais avulsos. Campos: `codigo`, `nome`, `categoria`, `itens[]`. **Sem campo de
custo** — o custo é sempre derivado da soma dos itens. **Kit não pode conter outro kit** (sem
aninhamento).

### Item de kit
Cada linha da composição de um kit: aponta para um material (de **qualquer categoria**), e carrega
**unidade própria por item**. As quantidades do item são definidas **por tipologia**, não no kit —
o item na mesma unidade do componente herda a quantidade dele; os demais pedem a sua (ver
`docs/features/pricing.md`, "Kits"). O custo é o do material apontado, no empreendimento em questão.

### Item de custo (insumo)
| Campo | Significado |
|---|---|
| `codigo` | Código livre, opcional (o da planilha da construtora). Único por org quando preenchido. |
| `nome` | Ex.: "Argamassa colante ACIII cinza", "Assentamento de piso em porcelanato 90×90". |
| `unidade` | Unidade do insumo (kg, und, m², vb…). |

**Sem preço no catálogo** — o preço é por empreendimento (`EnterpriseCostItemPrice`), como o custo
do material. Apagar um insumo o tira de todas as composições (a interface confirma "usado em N
materiais").

### Composição de custo do material
Linhas de **insumo × quantitativo por unidade do material** (`MaterialCompositionItem`) mais o
**quantitativo do próprio material** (`custoQtd`, ex.: 1,2 = 20 % de quebra). Vale para todos os
empreendimentos, como a composição de um kit; os **preços** vêm do empreendimento. Editada no
painel da linha na aba "Custos base" do Construtor de Preço; "Aplicar composição em…" copia para
outros materiais da mesma categoria. Kit não tem composição (soma os filhos). Ver
`docs/features/pricing.md` §2.

### Categoria
`nome` + `cor` (uma de 10: cinza, vermelho, laranja, amarelo, verde, teal, azul, ciano, roxo,
rosa; padrão cinza) + `usos` (quantos materiais/kits a usam). **Não há lista fixa de categorias** —
são todas criadas pela org.

### Conceito importante: "material do catálogo" ≠ "opção de componente"
O material do catálogo é o **cadastro reutilizável**. Quando ele é escolhido como opção (padrão ou
upgrade) dentro de um componente de uma tipologia, isso é **outra coisa** — uma *opção de
componente*, que referencia o material e ganha preço/posição próprios. Na base atual as duas coisas
se chamam "Material", o que confunde. **Na nova versão, dar nomes distintos** (ex.: *Material* do
catálogo × *Opção* do componente).

### Unidades
`m² · ml · und · pç · cj · kg · m³ · l · vb · dia · h · sc`. Grafias de planilha (M2, UN, KG, M3, VB)
são normalizadas ao colar/importar.

---

## 3. Fluxos do usuário

### Criar / editar material
Formulário: **Código de referência**, **Categoria**, **Especificação completa**, **Fabricante**,
**Imagem de Preview**. **Sem campo de custo e sem unidade.** Texto na tela: "Os custos podem ser
preenchidos diretamente na revisão ou via link de preenchimento."
- Válido com **especificação + categoria** preenchidas (resto opcional).
- Criação e edição mexem só em identidade — **não existe campo de custo aqui**.

### Criar / editar kit
Formulário: **Nome do kit**, **Categoria**, **Composição** (lista de itens).
- Adiciona itens escolhendo materiais avulsos (não kits) de **qualquer categoria** — piso +
  rodapé + soleira é o caso comum; a categoria classifica o kit, não filtra os itens. Cada item tem
  seletor de **unidade própria** (é ela que decide se o item herda a quantidade do componente).
  Material repetido é ignorado.
- Trocar ou renomear a categoria do kit **não** mexe na composição.
- Válido com **nome + categoria + ao menos 1 item**.

### Criar / editar / excluir categoria
Feito inline (popover), reaproveitado no formulário, na célula da tabela e no filtro.
- **Criar:** digita o nome; se não existir igual (ignorando maiúsculas), oferece "Criar '{nome}'".
- **Editar:** renomear + escolher cor (10 opções) + excluir.
- **Excluir:** confirmação em dois passos; avisa "{n} item(ns) ficará(ão) sem categoria" quando há
  uso.

### Importar CSV (assistente de 4 passos: Upload → Mapeamento → Pré-visualização → Importado)
- **Upload:** só `.csv`, até **5 MB**. Colunas esperadas: `codigo, nome, fabricante, categoria,
  custo_mat, custo_mo` (as duas últimas **caem em "Ignorar"**: custo não é do catálogo).
- **Mapeamento:** as colunas são auto-associadas por sinônimos PT-BR; dá pra sobrescrever cada
  coluna (Ignorar / Código / Especificação / Fabricante / Categoria / Custo material / Custo mão de
  obra). **Só avança quando alguma coluna vira "Especificação".** **Não existe alvo "unidade"** —
  colunas de unidade são ignoradas.
- **Pré-visualização:** mostra quantas linhas entram + caixa de linhas descartadas com motivo.
- **Importado:** grava em lote; "Campos de custo serão preenchidos pela construtora."

**Regras de conversão do CSV:**
- Linha **sem especificação** → descartada ("sem especificação").
- Linha **sem categoria** → descartada ("sem categoria"). *(Categoria é obrigatória na importação —
  mas uma categoria de nome novo é **criada**, não descartada.)*
- Custo vazio / `—` / `-` → `0`; remove `R$`; aceita decimal com vírgula; **negativo → `0`**.

### Excluir material ou kit
**Não há exclusão de material/kit na interface** — a única ação de linha é "Editar". (Ver §6: existe
regra de bloqueio quando em uso, mas não há botão hoje.)

---

## 4. Regras de negócio

- **Custo pendente:** conceito de **empreendimento**, não de catálogo. Um material sem
  `EnterpriseMaterialCost` (ou com custo de material `0`) está pendente **naquela obra** e pode estar
  perfeitamente precificado em outra. Não há flag: a pendência é derivada do custo.
- **Custo do kit = soma dos sub-itens.** Nunca é guardado no kit.
- **Material não tem unidade** — a unidade vem do componente (uso) ou do sub-item do kit.
- **Kit não aninha kit.**
- **Quantidades são por tipologia**, não do catálogo.
- **Nome de categoria é único, ignorando maiúsculas/acentos** (validado na aplicação): criar recusa
  duplicata, renomear recusa duplicata (menos ela mesma), nome vazio é recusado. É isso que impede
  uma coluna "piso" no CSV de duplicar a categoria "Piso".
- **Categoria é "acha ou cria":** definir a categoria com um nome novo (no material, no kit ou no
  CSV) cria a categoria (cor cinza) na hora.
- **Excluir categoria não apaga materiais** — eles ficam "sem categoria".
- **Material/kit em uso não pode ser excluído** — quem está sendo usado como opção (ou como filho
  de kit) é protegido; a mensagem orienta remover os usos antes. Apagar um material **leva a
  composição junto**; apagar um insumo o remove de todas as composições.
- **Editar a composição do kit preserva as quantidades por tipologia** dos itens que continuam; só
  o item removido leva as suas junto.
- **Ordenação:** na listagem unificada, **kits aparecem antes de materiais**.

---

## 5. Estados e casos de borda

- **Material pendente:** **não existe selo de "pendente" na tela do catálogo**, e nem poderia — a
  pendência é por empreendimento. Ela aparece na aba "Custos base" do Construtor de Preço.
- **Catálogo vazio:** estado vazio com atalhos de importar/adicionar. **Filtro sem resultado:**
  "Nenhum material ou kit encontrado."
- **Contagem de "usos" da categoria** (org inteira) é diferente da coluna **"Uso"** por linha
  (usos como opção no projeto atual) — mesma palavra, denominadores diferentes. Fonte de confusão.
- **CSV:** linhas descartadas listadas com motivo; pluralização PT-BR em tudo.

---

## 6. "Onde é usado?" — rastreio de uso

Mostra onde um material/kit aparece como **opção de componente** (padrão ou upgrade), listando
Tipologia / Ambiente / Componente / Função. Usado no modal "Onde é usado?" e na coluna "Uso".

**Lacunas (confirmar na nova versão):**
- **Só** conta uso como **opção de componente**.
- **Não** conta material que só entra como **sub-item de kit**.
- O uso de um **insumo** nas composições é contado à parte, na aba "Itens de custo" ("usado em N
  materiais").
- Por isso o "em uso" mostrado ao usuário e o "em uso" que bloqueia exclusão **podem discordar**.

---

## 7. Questões em aberto (decidir na nova versão)

1. **Exclusão de material/kit:** a ausência de exclusão na interface é intencional (catálogo é só
   adicionar/editar) ou ficou pela metade? A regra de bloqueio por uso já existe.
2. **CSV — categoria obrigatória:** manter categoria obrigatória na importação, ou permitir cair em
   "sem categoria"? (Hoje é obrigatória, mas categoria nova é criada.) *Obs.: as suposições de
   "categoria desconhecida → descartada" e "unidade desconhecida → und" **não existem** no
   comportamento atual.*
3. **Código único:** código de material/kit deveria ser único/validado? Hoje o código de kit é
   gerado automaticamente (mock, com colisão fácil) e não há validação de unicidade.
4. **Custo nunca no catálogo:** resolvido em 2026-07-23 — as colunas de custo foram dropadas do
   `BaseMaterial`. O preenchimento é exclusivo da aba "Custos base" / portal.
5. **Uso deve bloquear exclusão?** Qual o sinal de "posso excluir?" que o usuário deve ver, dado
   que o "Uso" da interface ignora sub-itens de kit?
6. **Nomear "material do catálogo" × "opção de componente"** com nomes distintos (ver §2).
