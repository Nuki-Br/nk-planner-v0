# Roadmap — tabela do Construtor de Preço (funcionalidades "estilo Excel")

> Levantamento feito em 07/07/2026 a pedido do Felipe: o objetivo de produto é que o
> usuário tenha quase as mesmas liberdades para montar a tabela de preço que teria
> no Excel. Abaixo: o que a tabela já faz hoje e o roadmap sugerido, priorizado por
> valor × esforço. Nada daqui está implementado além da seção "O que já existe".

## O que já existe hoje

Motor de fórmulas: `src/lib/formula/` · células/colunas: `src/features/budget/`.

| # | Funcionalidade | Detalhe |
|---|---|---|
| 1 | Valor fixo por célula | Vírgula decimal ("12,5") e sufixo `%` ("10%") |
| 2 | Fórmulas por célula | `=` + operadores `+ − × ÷`, parênteses, `%` pós-fixado, precedência correta |
| 3 | Referências por nome | Colunas à esquerda ("Taxa Construtora" → `taxa_construtora`) + 3 variáveis da linha: `custo_troca`, `valor_unitario`, `quantitativo` |
| 4 | Autocomplete de referências | Até 6 sugestões enquanto digita a fórmula |
| 5 | Avaliação ao vivo | Pré-visualização do resultado; erros em PT-BR (`#ERR` com tooltip: divisão por zero, coluna não encontrada etc.) |
| 6 | Fórmula padrão por coluna + override por célula | Célula editada vira override; "↩ redefinir para o padrão da coluna" |
| 7 | Colunas configuráveis | Adicionar (3 tipos: livre, total da linha ƒ, média da linha ƒ), renomear (duplo-clique), excluir (limpa overrides), reordenar (drag & drop) |
| 8 | Recálculo em tempo real | Célula → linha → subtotal do ambiente → total geral |
| 9 | Linhas de kit expansíveis | Sub-itens com quantitativos; pendência exclui do total |
| 10 | Preenchimento inline de custo pendente | Célula vira input (ou sub-linha expansível) |
| 11 | Agrupamento por ambiente | Subtotais por ambiente + total geral; crédito (padrão) vs débito (upgrade) |
| 12 | Coluna fixa no scroll | "Especificação" sticky no scroll horizontal |
| 13 | Duas visões sincronizadas | Preço final ⇄ Custos base (mesma base de dados) |
| 14 | Versionamento | Salvar/restaurar versões com resumo de mudanças |
| 15 | Comentários por linha | Threads construtora/incorporadora |

## Roadmap sugerido

Esforço (ordem de grandeza neste MVP): **B** = horas · **M** = 1–2 dias · **A** = 3+ dias.

### Alta prioridade — "motor de grid" (fazer juntos: 1–3)

| # | Funcionalidade | Esforço | Notas |
|---|---|---|---|
| 1 | Navegação por teclado | M | Setas/Tab/Enter movem a seleção; Enter/F2 editam; Esc cancela. Fundação de tudo |
| 2 | Seleção de célula/intervalo/linha/coluna | M | Clique no header seleciona a coluna; Shift+clique estende; base para ações em massa |
| 3 | Copiar/colar (Ctrl+C/V) | M/A | Interoperável com Excel/Sheets via clipboard TSV (colar valores ou fórmulas) |
| 4 | Alça de preenchimento (fill handle) | M | Arrastar o canto da célula replica valor/fórmula para as linhas de baixo |
| 5 | Funções na fórmula: `SE`, `MIN`, `MAX`, `MEDIA`, `SOMA`, `ARRED` | M | Extensão da gramática existente em `src/lib/formula` |
| 6 | Desfazer/refazer (Ctrl+Z / Ctrl+Y) | M/A | Histórico sobre overrides e operações de coluna |

### Média prioridade

| # | Funcionalidade | Esforço | Notas |
|---|---|---|---|
| 7 | Referências verticais / intervalos entre linhas | A | Hoje o escopo da fórmula é só a própria linha; pré-requisito do item 8 |
| 8 | PROCV/XLOOKUP sobre tabelas nomeadas | A | Ex.: buscar custo/fabricante no Catálogo de materiais por código |
| 9 | Ordenar/filtrar linhas por coluna | M | Dentro do grupo de ambiente |
| 10 | Formatação condicional por regra | M | Ex.: variação > 15% → âmbar (hoje existe hard-coded em pontos específicos; generalizar) |
| 11 | Congelar colunas adicionais | B | Hoje só "Especificação" é sticky |
| 12 | Exportar CSV/XLSX da tabela calculada | B/M | XLSX via lib (ex.: exceljs) |
| 13 | Comentário por célula | M | Hoje as threads são por linha |

### Baixa prioridade / fora do domínio

- Formatação manual livre (cores/negrito por célula) — foge do padrão visual do produto.
- Abas arbitrárias de planilha — já existem abas por tipologia.
- Macros/scripts — sem caso de uso no domínio.

### Sequência recomendada

1. **Leva 1 (motor de grid):** itens 1–3 — mudam a sensação da tabela para "planilha de verdade".
2. **Leva 2:** itens 4–6 (produtividade de edição).
3. **Leva 3 (salto grande):** itens 7–8 (referências verticais + PROCV) — mexem na arquitetura do
   motor de fórmulas e merecem fase própria com testes dedicados.
4. Itens 9–13 encaixam como acompanhamento conforme o feedback do beta.
