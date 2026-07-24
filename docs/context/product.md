# Contexto de produto — Nuki & módulo Planner

> Condensado das fontes de contexto da Nuki. Fonte completa:
> `../../Nuki-Planner-v1/uploads/nuki-modulo-produto-fluxo-v3.md` e o contexto da empresa.

## A Nuki
Plataforma SaaS B2B para construtoras/incorporadoras que centraliza o ciclo completo de
personalização de acabamentos das unidades — do planejamento de custos à validação em obra.
Três módulos: **Planner** (antes da venda) → **Personaliza** (durante a venda) → **Inspetor**
(após a obra). Modelo de recorrência por empreendimento ativo.

## O módulo Planner
Ponto de entrada do ciclo. Digitaliza a definição de materiais, composição de custos e
formação de preços de personalização — hoje feito em planilhas ao longo de 3–4 meses. Ao
publicar, alimenta automaticamente o módulo Personaliza (fase 02).

### Atores
- **Incorporadora** (autenticada): configura catálogo, tipologias, kits, taxas; valida custos e publica.
- **Terceiro** (construtora/orçamentista, via link tokenizado sem login): preenche custos de
  material e mão de obra por item, conforme o escopo do link.
- **Admin Nuki** (autenticado): suporte/visualização; não participa do fluxo.

### Jornada
```
CONFIGURAÇÃO  → Config base → Tipologias ⇄ Visualizador (canvas) ; Grupos de unidades ; Catálogo
CUSTOS        → Custos base do empreendimento (opcional: link p/ terceiro) → Preço final por tipologia
PUBLICAÇÃO    → Publicar → alimenta a fase 02
```

### Conceitos-chave do domínio
- **Empreendimento (Project)** — torres, taxas globais, colunas de preço, status.
- **Grupo de unidades (UnitGroup)** — números de apartamentos compatíveis, por torre; vinculado a tipologias.
- **Tipologia (Blueprint)** — variação de planta: ambientes, características.
- **Ambiente (Room)** — ícone, local na planta; pode ser compartilhado entre tipologias.
- **Componente (Component)** — unidade, quantidade, tolerância RT; material/kit padrão + upgrades; flag fantasma.
- **Material** / **Kit** (kit = soma de materiais avulsos; quantitativos por tipologia) — o material
  carrega **imagem** (foto/render do acabamento), vinda do media center.
- **Orçamento por tipologia** — colunas configuráveis com fórmulas livres; recálculo em tempo real no cliente.
- **Versão do orçamento (BudgetVersion)**, **Comentário**, **Post-it (CanvasNote)**, **MediaAsset**.

### Fora de escopo (v1 do produto)
Integração com ERPs · aprovação multinível · render 3D · comparação multi-fornecedor · módulo de obra.

**Imagem de ambiente e de planta é do Personaliza, não do Planner** (confirmado em 2026-07-15).
No Planner a única imagem é a do material. As colunas `Room.BaseImageUrl`,
`Blueprint.ImageUrl` e `BlueprintRoom.DrawnImageUrl` existem no schema por
alinhamento à API de customização, mas não são superfície deste módulo.
