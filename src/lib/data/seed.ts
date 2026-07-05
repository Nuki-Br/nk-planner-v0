// Seed do store mock — port tipado e fiel de docs/prototype-src/data.js.
// Strings, datas e valores verbatim do protótipo (não "melhorar" redação).
// Preços em BRL, áreas em m², comprimentos em ml, unidades em und.
import { TAX_COLUMNS_DEFAULT } from "@/shared/constants/budget";
import type {
  BudgetVersion,
  Comment,
  Kit,
  Material,
  Project,
  Tipologia,
  UnitGroup,
} from "@/shared/types/domain";

export interface SeedData {
  materiais: Material[];
  kits: Kit[];
  tipologias: Tipologia[];
  torres: string[];
  unitGroups: UnitGroup[];
  /** Chaves `${compId}-${optId}` / `${compId}-${kitId}-${matId}` (Set no protótipo; array p/ sobreviver a JSON na Fase 10). */
  pendingItems: string[];
  versions: BudgetVersion[];
  /** projects[0] (p001) já vem enriquecido com os extras do THE_PROJECT do protótipo. */
  projects: Project[];
  /** rowKey (`${compId}-${optId}`) → thread. */
  comments: Record<string, Comment[]>;
}

/** Retorna uma estrutura NOVA a cada chamada (sem referências compartilhadas). */
export function createSeed(): SeedData {
  const materiais: Material[] = [
    // Pisos
    { id: "piso-001", codigo: "PO-6060-CR", nome: "Porcelanato Acetinado 60×60 Creme", fabricante: "Eliane", categoria: "Piso", unidade: "m²", custoMat: 62.5, custoMO: 22.0 },
    { id: "piso-002", codigo: "PP-6060-BI", nome: "Porcelanato Polido 60×60 Bianco", fabricante: "Portinari", categoria: "Piso", unidade: "m²", custoMat: 98.0, custoMO: 22.0 },
    { id: "piso-003", codigo: "PP-9090-SW", nome: "Porcelanato Polido 90×90 Super White", fabricante: "Portinari", categoria: "Piso", unidade: "m²", custoMat: 156.0, custoMO: 28.0 },
    { id: "piso-004", codigo: "MC-NAT-CA", nome: "Mármore Carrara Polido A", fabricante: "Borghetti", categoria: "Piso", unidade: "m²", custoMat: 320.0, custoMO: 52.0 },
    // Revestimentos
    { id: "rev-001", codigo: "RR-3060-WH", nome: "Revestimento Retificado 30×60 Bold Branco", fabricante: "Eliane", categoria: "Revestimento", unidade: "m²", custoMat: 48.0, custoMO: 28.0 },
    { id: "rev-002", codigo: "RM-3060-MP", nome: "Revestimento Mármore Polido 30×60", fabricante: "Atlas Concorde", categoria: "Revestimento", unidade: "m²", custoMat: 92.0, custoMO: 28.0 },
    { id: "rev-003", codigo: "RM-2060-GD", nome: "Revestimento Metalizado 20×60 Gold", fabricante: "Portinari", categoria: "Revestimento", unidade: "m²", custoMat: 145.0, custoMO: 35.0 },
    // Pedras
    { id: "ped-001", codigo: "GB-SIE-POL", nome: "Granito Branco Siena Polido", fabricante: "Minaspedras", categoria: "Pedra", unidade: "ml", custoMat: 380.0, custoMO: 0 },
    { id: "ped-002", codigo: "QC-CRI-POL", nome: "Quartzito Branco Cristal Polido", fabricante: "Importado", categoria: "Pedra", unidade: "ml", custoMat: 680.0, custoMO: 0 },
    { id: "ped-003", codigo: "MS-STAT-POL", nome: "Mármore Statuario Extra Polido", fabricante: "Importado", categoria: "Pedra", unidade: "ml", custoMat: 1200.0, custoMO: 0 },
    // Metais
    { id: "met-001", codigo: "DCK-PF-001", nome: "Conjunto Metais Linha Preto Fosco", fabricante: "Deca", categoria: "Metal", unidade: "und", custoMat: 850.0, custoMO: 0 },
    { id: "met-002", codigo: "DCK-CR-002", nome: "Conjunto Metais Cromado Premium", fabricante: "Deca", categoria: "Metal", unidade: "und", custoMat: 1240.0, custoMO: 0 },
    { id: "met-003", codigo: "LRZ-DE-003", nome: "Conjunto Metais Dourado Escovado", fabricante: "Lorenzetti", categoria: "Metal", unidade: "und", custoMat: 2180.0, custoMO: 0 },
    // Rodapé
    { id: "rod-001", codigo: "RDP-7-BR", nome: "Rodapé MDF Laminado 7cm Branco", fabricante: "Eucatex", categoria: "Rodapé", unidade: "ml", custoMat: 18.0, custoMO: 12.0 },
    { id: "rod-002", codigo: "RDP-15-BR", nome: "Rodapé MDF Premium 15cm Branco", fabricante: "Madeirit", categoria: "Rodapé", unidade: "ml", custoMat: 32.0, custoMO: 12.0 },
    // Cubas
    { id: "cub-001", codigo: "RCA-SB-55", nome: "Cuba Semiencastrar 55cm Branco", fabricante: "Roca", categoria: "Cuba/Louça", unidade: "und", custoMat: 420.0, custoMO: 0 },
    { id: "cub-002", codigo: "DCA-SQ-55", nome: "Cuba Embutir Square Branco", fabricante: "Deca", categoria: "Cuba/Louça", unidade: "und", custoMat: 680.0, custoMO: 0 },
    { id: "cub-003", codigo: "RCA-LX-60", nome: "Cuba de Apoio Luxo Oval Branco", fabricante: "Roca", categoria: "Cuba/Louça", unidade: "und", custoMat: 1150.0, custoMO: 0 },
    // Metais avulsos (compõem kits)
    { id: "met-b-001", codigo: "DCK-DH-BR", nome: "Ducha Higiênica Bronze Escovado", fabricante: "Deca", categoria: "Metal", unidade: "und", custoMat: 170.0, custoMO: 0 },
    { id: "met-b-002", codigo: "DCK-MC-BR", nome: "Monocomando p/ Chuveiro Bronze", fabricante: "Deca", categoria: "Metal", unidade: "und", custoMat: 520.0, custoMO: 0 },
    { id: "met-b-003", codigo: "DCK-CH-BR", nome: "Chuveiro de Teto Bronze 20cm", fabricante: "Deca", categoria: "Metal", unidade: "und", custoMat: 280.0, custoMO: 0 },
    { id: "met-b-004", codigo: "DCK-TB-BR", nome: "Torneira de Bancada Bronze", fabricante: "Deca", categoria: "Metal", unidade: "und", custoMat: 100.0, custoMO: 0 },
    // Pisos avulsos (compõem kits)
    { id: "piso-bcn", codigo: "PB-9090-AC", nome: "Porcelanato Barcelona Acetinado 90×90", fabricante: "Portinari", categoria: "Piso", unidade: "m²", custoMat: 180.0, custoMO: 28.0 },
    { id: "sol-bcn", codigo: "SL-GR-BCN", nome: "Soleira Granito Barcelona Polida", fabricante: "Minaspedras", categoria: "Piso", unidade: "und", custoMat: 95.0, custoMO: 20.0 },
    { id: "rt-bcn", codigo: "RT-9090-AC", nome: "Reserva Técnica Porcelanato Barcelona", fabricante: "Portinari", categoria: "Piso", unidade: "m²", custoMat: 180.0, custoMO: 0 },
  ];

  const kits: Kit[] = [
    { id: "kit-metais-bronze", tipo: "kit", codigo: "KIT-MB", nome: "Metais Bronze", categoria: "Metal", itens: ["met-b-001", "met-b-002", "met-b-003", "met-b-004"] },
    { id: "kit-piso-barcelona", tipo: "kit", codigo: "KIT-PB", nome: "Piso Barcelona + Soleira + RT", categoria: "Piso", itens: ["piso-bcn", "sol-bcn", "rt-bcn"] },
  ];

  const tipologias: Tipologia[] = [
    {
      id: "t1",
      nome: "Planta A — 86m²",
      metragem: 86,
      descricao: "2 dormitórios, sala integrada, cozinha americana, 1 banheiro",
      unidades: 24,
      status: "completa",
      ambientes: [
        {
          id: "a1-1",
          nome: "Sala/Living",
          componentes: [
            { id: "c1-1-1", nome: "Piso", unidade: "m²", qtd: 18.4, rt: 15, padrao: "piso-001", upgrades: ["piso-002", "piso-003", "kit-piso-barcelona"], taxaEspecifica: null, kitQtds: { "kit-piso-barcelona": { "piso-bcn": 18.4, "sol-bcn": 2, "rt-bcn": 1.84 } } },
            { id: "c1-1-2", nome: "Rodapé", unidade: "ml", qtd: 16.8, rt: 5, padrao: "rod-001", upgrades: ["rod-002"], taxaEspecifica: null },
          ],
        },
        {
          id: "a1-2",
          nome: "Cozinha",
          componentes: [
            { id: "c1-2-1", nome: "Piso", unidade: "m²", qtd: 7.2, rt: 15, padrao: "piso-001", upgrades: ["piso-002"], taxaEspecifica: null },
            { id: "c1-2-2", nome: "Revestimento parede", unidade: "m²", qtd: 5.6, rt: 10, padrao: "rev-001", upgrades: ["rev-002"], taxaEspecifica: null },
            { id: "c1-2-3", nome: "Pedra bancada", unidade: "ml", qtd: 2.8, rt: 0, padrao: "ped-001", upgrades: ["ped-002"], taxaEspecifica: null },
          ],
        },
        {
          id: "a1-3",
          nome: "Dormitório 1",
          componentes: [
            { id: "c1-3-1", nome: "Piso", unidade: "m²", qtd: 10.8, rt: 15, padrao: "piso-001", upgrades: ["piso-002"], taxaEspecifica: null },
          ],
        },
        {
          id: "a1-4",
          nome: "Dormitório 2",
          componentes: [
            { id: "c1-4-1", nome: "Piso", unidade: "m²", qtd: 9.6, rt: 15, padrao: "piso-001", upgrades: ["piso-002"], taxaEspecifica: null },
          ],
        },
        {
          id: "a1-5",
          nome: "Banheiro Social",
          componentes: [
            { id: "c1-5-1", nome: "Piso", unidade: "m²", qtd: 3.2, rt: 10, padrao: "piso-001", upgrades: ["piso-002"], taxaEspecifica: null },
            { id: "c1-5-2", nome: "Revestimento parede", unidade: "m²", qtd: 11.8, rt: 10, padrao: "rev-001", upgrades: ["rev-002", "rev-003"], taxaEspecifica: null },
            { id: "c1-5-3", nome: "Cuba/Louça", unidade: "und", qtd: 1, rt: 0, padrao: "cub-001", upgrades: ["cub-002"], taxaEspecifica: null },
            { id: "c1-5-4", nome: "Metais", unidade: "und", qtd: 1, rt: 0, padrao: "met-001", upgrades: ["met-002", "kit-metais-bronze"], taxaEspecifica: null, kitQtds: { "kit-metais-bronze": { "met-b-001": 2, "met-b-002": 1, "met-b-003": 1, "met-b-004": 1 } } },
          ],
        },
      ],
    },
    {
      id: "t2",
      nome: "Planta B — 115m²",
      metragem: 115,
      descricao: "3 dormitórios (1 suíte master), sala ampla, varanda gourmet, 2 banheiros",
      unidades: 36,
      status: "completa",
      ambientes: [
        {
          id: "a2-1",
          nome: "Sala/Living",
          componentes: [
            { id: "c2-1-1", nome: "Piso", unidade: "m²", qtd: 28.4, rt: 15, padrao: "piso-001", upgrades: ["piso-002", "piso-003", "piso-004"], taxaEspecifica: null },
            { id: "c2-1-2", nome: "Rodapé", unidade: "ml", qtd: 22.8, rt: 5, padrao: "rod-001", upgrades: ["rod-002"], taxaEspecifica: null },
          ],
        },
        {
          id: "a2-2",
          nome: "Cozinha",
          componentes: [
            { id: "c2-2-1", nome: "Piso", unidade: "m²", qtd: 9.6, rt: 15, padrao: "piso-001", upgrades: ["piso-002"], taxaEspecifica: null },
            { id: "c2-2-2", nome: "Revestimento parede", unidade: "m²", qtd: 7.2, rt: 10, padrao: "rev-001", upgrades: ["rev-002", "rev-003"], taxaEspecifica: null },
            { id: "c2-2-3", nome: "Pedra bancada", unidade: "ml", qtd: 3.8, rt: 0, padrao: "ped-001", upgrades: ["ped-002", "ped-003"], taxaEspecifica: null },
          ],
        },
        {
          id: "a2-3",
          nome: "Suíte Master",
          componentes: [
            { id: "c2-3-1", nome: "Piso", unidade: "m²", qtd: 15.4, rt: 15, padrao: "piso-001", upgrades: ["piso-002", "piso-003"], taxaEspecifica: null },
          ],
        },
        {
          id: "a2-4",
          nome: "Dormitório 2",
          componentes: [
            { id: "c2-4-1", nome: "Piso", unidade: "m²", qtd: 11.2, rt: 15, padrao: "piso-001", upgrades: ["piso-002"], taxaEspecifica: null },
          ],
        },
        {
          id: "a2-5",
          nome: "Dormitório 3",
          componentes: [
            { id: "c2-5-1", nome: "Piso", unidade: "m²", qtd: 10.8, rt: 15, padrao: "piso-001", upgrades: ["piso-002"], taxaEspecifica: null },
          ],
        },
        {
          id: "a2-6",
          nome: "Banheiro Suíte",
          componentes: [
            { id: "c2-6-1", nome: "Piso", unidade: "m²", qtd: 4.2, rt: 10, padrao: "piso-001", upgrades: ["piso-002", "piso-003"], taxaEspecifica: null },
            { id: "c2-6-2", nome: "Revestimento parede", unidade: "m²", qtd: 16.8, rt: 10, padrao: "rev-001", upgrades: ["rev-002", "rev-003"], taxaEspecifica: null },
            { id: "c2-6-3", nome: "Cuba/Louça", unidade: "und", qtd: 1, rt: 0, padrao: "cub-001", upgrades: ["cub-002", "cub-003"], taxaEspecifica: null },
            { id: "c2-6-4", nome: "Metais", unidade: "und", qtd: 1, rt: 0, padrao: "met-001", upgrades: ["met-002", "met-003"], taxaEspecifica: null },
            { id: "c2-6-5", nome: "Pedra bancada", unidade: "ml", qtd: 1.2, rt: 0, padrao: "ped-001", upgrades: ["ped-002"], taxaEspecifica: null },
          ],
        },
        {
          id: "a2-7",
          nome: "Banheiro Social",
          componentes: [
            { id: "c2-7-1", nome: "Piso", unidade: "m²", qtd: 3.6, rt: 10, padrao: "piso-001", upgrades: ["piso-002"], taxaEspecifica: null },
            { id: "c2-7-2", nome: "Revestimento parede", unidade: "m²", qtd: 14.4, rt: 10, padrao: "rev-001", upgrades: ["rev-002"], taxaEspecifica: null },
            { id: "c2-7-3", nome: "Cuba/Louça", unidade: "und", qtd: 1, rt: 0, padrao: "cub-001", upgrades: ["cub-002"], taxaEspecifica: null },
            { id: "c2-7-4", nome: "Metais", unidade: "und", qtd: 1, rt: 0, padrao: "met-001", upgrades: ["met-002"], taxaEspecifica: null },
          ],
        },
      ],
    },
    {
      id: "t3",
      nome: "Planta C — 142m²",
      metragem: 142,
      descricao: "4 dormitórios (2 suítes), home office, varanda gourmet ampla",
      unidades: 12,
      status: "incompleta",
      ambientes: [
        {
          id: "a3-1",
          nome: "Sala/Living",
          componentes: [
            { id: "c3-1-1", nome: "Piso", unidade: "m²", qtd: 36.8, rt: 15, padrao: "piso-001", upgrades: ["piso-002", "piso-003", "piso-004", "kit-piso-barcelona"], taxaEspecifica: null, kitQtds: { "kit-piso-barcelona": { "piso-bcn": 36.8, "sol-bcn": 3, "rt-bcn": 3.68 } } },
            { id: "c3-1-2", nome: "Rodapé", unidade: "ml", qtd: 28.4, rt: 5, padrao: "rod-001", upgrades: ["rod-002"], taxaEspecifica: null },
          ],
        },
        {
          id: "a3-2",
          nome: "Cozinha",
          componentes: [
            { id: "c3-2-1", nome: "Piso", unidade: "m²", qtd: 11.2, rt: 15, padrao: "piso-001", upgrades: ["piso-002"], taxaEspecifica: null },
            { id: "c3-2-2", nome: "Revestimento parede", unidade: "m²", qtd: 8.8, rt: 10, padrao: "rev-001", upgrades: ["rev-002", "rev-003"], taxaEspecifica: null },
            { id: "c3-2-3", nome: "Pedra bancada", unidade: "ml", qtd: 4.6, rt: 0, padrao: "ped-001", upgrades: ["ped-002", "ped-003"], taxaEspecifica: null },
          ],
        },
        {
          id: "a3-3",
          nome: "Suíte Master",
          componentes: [
            { id: "c3-3-1", nome: "Piso", unidade: "m²", qtd: 18.6, rt: 15, padrao: "piso-001", upgrades: ["piso-002", "piso-003"], taxaEspecifica: null },
            { id: "c3-3-2", nome: "Nicho", unidade: "und", qtd: 1, rt: 0, padrao: null, upgrades: [], taxaEspecifica: null },
          ],
        },
        {
          id: "a3-4",
          nome: "Suíte 2",
          componentes: [
            { id: "c3-4-1", nome: "Piso", unidade: "m²", qtd: 14.4, rt: 15, padrao: "piso-001", upgrades: ["piso-002"], taxaEspecifica: null },
          ],
        },
      ],
    },
  ];

  const torres = ["Torre A", "Torre B", "Torre C"];

  const unitGroups: UnitGroup[] = [
    { id: "ug-a-01", nome: "Coluna final 01 — Vista Parque", torre: "Torre A", unidades: ["101", "111", "121", "131", "141", "151", "161"] },
    { id: "ug-a-02", nome: "Coluna final 02 — Vista Interna", torre: "Torre A", unidades: ["102", "112", "122", "132", "142", "152", "162"] },
    { id: "ug-b-01", nome: "Coluna final 03 — Vista Parque", torre: "Torre B", unidades: ["103", "113", "123", "133", "143", "153"] },
    { id: "ug-b-02", nome: "Coberturas Duplex", torre: "Torre B", unidades: ["1701", "1702"] },
    { id: "ug-c-01", nome: "Garden — Térreo", torre: "Torre C", unidades: ["11", "12", "13", "14"] },
  ];

  const pendingItems = [
    "c3-1-1-piso-004", // Sala/Living — Mármore Carrara
    "c3-2-2-rev-003", // Cozinha — Revestimento Gold
    "c3-2-3-ped-003", // Cozinha — Mármore Statuario
    "c3-3-1-piso-003", // Suíte Master — 90×90 Super White
    "c3-1-1-kit-piso-barcelona-rt-bcn", // Sub-item do kit (Reserva Técnica) sem custo base preenchido
  ];

  const versions: BudgetVersion[] = [
    {
      id: "v3",
      label: "v3",
      createdAt: "04/06/2026 às 14:27",
      createdBy: "Ana Carvalho",
      isCurrent: true,
      summary:
        "Ajuste de margem incorporadora de 20% para 25%. Adicionadas 3 opções de piso para a Planta A.",
      changes: {
        materiais: [
          { tipo: "adicionado", desc: "Porcelanato Nero Marquina 60×60 — Planta A, Sala, Piso" },
          { tipo: "adicionado", desc: "Porcelanato Calacatta Gold 60×60 — Planta A, Sala, Piso" },
          { tipo: "adicionado", desc: "Porcelanato Statuario 60×60 — Planta A, Sala, Piso" },
        ],
        custos: [
          { tipo: "alterado", desc: "Granito Branco Siena — R$ 280,00 → R$ 310,00 (+10,7%)" },
          { tipo: "alterado", desc: "Porcelanato Natural 60×60 — R$ 54,00 → R$ 58,00 (+7,4%)" },
        ],
        taxas: [{ tipo: "alterado", desc: "Taxa incorporadora — 20% → 25% (todas as tipologias)" }],
        tipologias: [],
      },
    },
    {
      id: "v2",
      label: "v2",
      createdAt: "21/05/2026 às 09:14",
      createdBy: "Ana Carvalho",
      isCurrent: false,
      summary:
        "Revisão de custos após retorno da Construtora Vertex. 8 itens com custo atualizado.",
      changes: {
        materiais: [],
        custos: [
          { tipo: "alterado", desc: "Granito Negro São Gabriel — R$ 260,00 → R$ 280,00 (+7,7%)" },
          { tipo: "alterado", desc: "Misturador de Cozinha — R$ 420,00 → R$ 480,00 (+14,3%)" },
        ],
        taxas: [],
        tipologias: [
          { tipo: "adicionado", desc: "Planta C — Studios adicionada com 2 ambientes e 6 componentes" },
        ],
      },
    },
    {
      id: "v1",
      label: "v1",
      createdAt: "07/05/2026 às 11:02",
      createdBy: "Marcos Leitão",
      isCurrent: false,
      summary: "Versão inicial — Plantas A e B configuradas.",
      changes: {
        materiais: [],
        custos: [],
        taxas: [],
        tipologias: [
          { tipo: "adicionado", desc: "Planta A — 166m² com 4 ambientes" },
          { tipo: "adicionado", desc: "Planta B — 123m² com 3 ambientes" },
        ],
      },
    },
  ];

  // NOTA: o mock original grava "itensPrenchidos" (typo) — corrigido para
  // itensPreenchidos aqui e no tipo Project (§6 do plano).
  const projects: Project[] = [
    {
      id: "p001",
      nome: "Parque Ibirapuera Residências",
      torre: "Torre Única",
      incorporadora: "Grupo Axis",
      construtora: "Vertex Engenharia",
      status: "em_revisao",
      enviadoEm: "10/05/2026",
      prazo: "25/05/2026",
      totalItens: 64,
      itensPreenchidos: 50,
      // Extras do THE_PROJECT (projeto ativo) do protótipo:
      inccBase: "04/2026",
      emailConstrutora: "orcamento@vertex.com.br",
      taxas: { construtora: 8, incc: 5, incorporadora: 22 },
      taxColumns: TAX_COLUMNS_DEFAULT.map((c) => ({ ...c })),
    },
    { id: "p002", nome: "Jardins do Tietê", torre: "Torres A e B", incorporadora: "Grupo Axis", construtora: "Construtora Meridiano", status: "publicado", enviadoEm: "12/03/2026", prazo: "28/03/2026", totalItens: 88, itensPreenchidos: 88 },
    { id: "p003", nome: "Residencial Serra Dourada", torre: "Torre 1", incorporadora: "Grupo Axis", construtora: "Vertex Engenharia", status: "em_preenchimento", enviadoEm: "28/05/2026", prazo: "10/06/2026", totalItens: 52, itensPreenchidos: 31 },
    { id: "p004", nome: "Vila Olímpia Towers", torre: "Torres A, B, C", incorporadora: "Grupo Axis", construtora: "Construtora Meridiano", status: "rascunho", enviadoEm: null, prazo: null, totalItens: 0, itensPreenchidos: 0 },
    { id: "p005", nome: "Alameda Santos Prime", torre: "Torre Única", incorporadora: "Grupo Axis", construtora: "Construtora RB", status: "rascunho", enviadoEm: null, prazo: null, totalItens: 0, itensPreenchidos: 0 },
  ];

  const comments: Record<string, Comment[]> = {
    "c2-1-1-piso-002": [
      { autor: "construtora", texto: "Cotação atualizada com base no pedido mínimo de 1000m². Preço válido por 30 dias.", data: "15/05/2026 14:32" },
      { autor: "incorporadora", texto: "OK, mas preciso confirmar o prazo de entrega. Pode garantir para Agosto?", data: "16/05/2026 09:18" },
      { autor: "construtora", texto: "Sim, entrega garantida para 15/08/2026. Confirmo por escrito.", data: "16/05/2026 11:45" },
    ],
    "c2-6-4-met-003": [
      { autor: "construtora", texto: "Material importado — preço sujeito à variação cambial. Adicionei buffer de 8%.", data: "14/05/2026 16:20" },
      { autor: "incorporadora", texto: "Entendido. Vamos manter esse valor mas preciso monitorar.", data: "15/05/2026 08:55" },
    ],
  };

  return {
    materiais,
    kits,
    tipologias,
    torres,
    unitGroups,
    pendingItems,
    versions,
    projects,
    comments,
  };
}
