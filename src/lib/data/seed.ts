// Seed do store mock (realinhado) — demo em SHAPE DE DOMÍNIO novo (ids number,
// opções como linhas, kitQtds por KitItem, custo em reais/0=pendente). Construído
// programaticamente com um alocador de id ÚNICO e global para manter os ids
// relacionais consistentes: no modelo compartilhado, a "Sala/Living" é UM Room
// (mesmos ids de componente/opção) que aparece em 3 plantas via BlueprintRoom —
// só qtd/RT/kitQtds variam por planta. Consumido por prisma/seed.ts (popular o
// banco) e pelos testes. Valores verbatim do protótipo; premium sem custo (=0)
// = pendente (aguardando cotação da construtora).
import { TAX_COLUMNS_DEFAULT } from "@/shared/constants/budget";
import type {
  Ambiente,
  BudgetVersion,
  Comment,
  Componente,
  Kit,
  KitItem,
  Material,
  MaterialOption,
  PortalFill,
  Project,
  Tipologia,
  Unidade,
} from "@/shared/types/domain";

/**
 * Material do seed com `unidade`: o domínio não tem mais unidade no Material,
 * mas o prisma/seed.ts ainda grava BaseMaterial.Unit (fallback de exibição de
 * kits antigos) e os sub-itens de kit herdam a unidade daqui.
 */
export type SeedMaterial = Material & { unidade: Unidade };

export interface SeedData {
  materiais: SeedMaterial[];
  kits: Kit[];
  tipologias: Tipologia[];
  torres: string[];
  unitGroups: { id: number; nome: string; torre: string; unidades: string[] }[];
  versions: BudgetVersion[];
  /** projects[0] é o empreendimento âncora (recebe tipologias/versões/colunas). */
  projects: Project[];
  /** rowKey (String(optionId)) → thread. */
  comments: Record<string, Comment[]>;
  /** String(baseMaterialId) → custos/comentário do terceiro. */
  portalFills: Record<string, PortalFill>;
}

/** Retorna uma estrutura NOVA a cada chamada (sem referências compartilhadas). */
export function createSeed(): SeedData {
  let seq = 0;
  const nid = () => ++seq;

  // ── Catálogo: materiais (key → SeedMaterial) ──
  const M: Record<string, SeedMaterial> = {};
  const matKeyById: Record<number, string> = {};
  function mat(
    key: string,
    codigo: string,
    nome: string,
    fabricante: string,
    categoria: string,
    unidade: Unidade,
    custoMat: number,
    custoMO: number
  ): SeedMaterial {
    const m: SeedMaterial = { id: nid(), codigo, nome, fabricante, categoria, unidade, custoMat, custoMO };
    M[key] = m;
    matKeyById[m.id] = key;
    return m;
  }

  const materiais: SeedMaterial[] = [
    // Pisos
    mat("piso-001", "PO-6060-CR", "Porcelanato Acetinado 60×60 Creme", "Eliane", "Piso", "m²", 62.5, 22.0),
    mat("piso-002", "PP-6060-BI", "Porcelanato Polido 60×60 Bianco", "Portinari", "Piso", "m²", 98.0, 22.0),
    mat("piso-003", "PP-9090-SW", "Porcelanato Polido 90×90 Super White", "Portinari", "Piso", "m²", 0, 28.0), // pendente
    mat("piso-004", "MC-NAT-CA", "Mármore Carrara Polido A", "Borghetti", "Piso", "m²", 0, 52.0), // pendente
    // Revestimentos
    mat("rev-001", "RR-3060-WH", "Revestimento Retificado 30×60 Bold Branco", "Eliane", "Revestimento", "m²", 48.0, 28.0),
    mat("rev-002", "RM-3060-MP", "Revestimento Mármore Polido 30×60", "Atlas Concorde", "Revestimento", "m²", 92.0, 28.0),
    mat("rev-003", "RM-2060-GD", "Revestimento Metalizado 20×60 Gold", "Portinari", "Revestimento", "m²", 0, 35.0), // pendente
    // Pedras
    mat("ped-001", "GB-SIE-POL", "Granito Branco Siena Polido", "Minaspedras", "Pedra", "ml", 380.0, 0),
    mat("ped-002", "QC-CRI-POL", "Quartzito Branco Cristal Polido", "Importado", "Pedra", "ml", 680.0, 0),
    mat("ped-003", "MS-STAT-POL", "Mármore Statuario Extra Polido", "Importado", "Pedra", "ml", 0, 0), // pendente
    // Metais
    mat("met-001", "DCK-PF-001", "Conjunto Metais Linha Preto Fosco", "Deca", "Metal", "und", 850.0, 0),
    mat("met-002", "DCK-CR-002", "Conjunto Metais Cromado Premium", "Deca", "Metal", "und", 1240.0, 0),
    mat("met-003", "LRZ-DE-003", "Conjunto Metais Dourado Escovado", "Lorenzetti", "Metal", "und", 2180.0, 0),
    // Rodapé
    mat("rod-001", "RDP-7-BR", "Rodapé MDF Laminado 7cm Branco", "Eucatex", "Rodapé", "ml", 18.0, 12.0),
    mat("rod-002", "RDP-15-BR", "Rodapé MDF Premium 15cm Branco", "Madeirit", "Rodapé", "ml", 32.0, 12.0),
    // Cubas
    mat("cub-001", "RCA-SB-55", "Cuba Semiencastrar 55cm Branco", "Roca", "Cuba/Louça", "und", 420.0, 0),
    mat("cub-002", "DCA-SQ-55", "Cuba Embutir Square Branco", "Deca", "Cuba/Louça", "und", 680.0, 0),
    mat("cub-003", "RCA-LX-60", "Cuba de Apoio Luxo Oval Branco", "Roca", "Cuba/Louça", "und", 1150.0, 0),
    // Metais avulsos (compõem kits)
    mat("met-b-001", "DCK-DH-BR", "Ducha Higiênica Bronze Escovado", "Deca", "Metal", "und", 170.0, 0),
    mat("met-b-002", "DCK-MC-BR", "Monocomando p/ Chuveiro Bronze", "Deca", "Metal", "und", 520.0, 0),
    mat("met-b-003", "DCK-CH-BR", "Chuveiro de Teto Bronze 20cm", "Deca", "Metal", "und", 280.0, 0),
    mat("met-b-004", "DCK-TB-BR", "Torneira de Bancada Bronze", "Deca", "Metal", "und", 100.0, 0),
    // Pisos avulsos (compõem kits)
    mat("piso-bcn", "PB-9090-AC", "Porcelanato Barcelona Acetinado 90×90", "Portinari", "Piso", "m²", 180.0, 28.0),
    mat("sol-bcn", "SL-GR-BCN", "Soleira Granito Barcelona Polida", "Minaspedras", "Piso", "und", 95.0, 20.0),
    mat("rt-bcn", "RT-9090-AC", "Reserva Técnica Porcelanato Barcelona", "Portinari", "Piso", "m²", 0, 0), // pendente
  ];

  // ── Catálogo: kits (key → Kit) ──
  const K: Record<string, Kit> = {};
  function kit(key: string, codigo: string, nome: string, categoria: string, itemKeys: string[]): Kit {
    const itens: KitItem[] = itemKeys.map((k) => {
      const src = M[k]!;
      return {
        id: nid(),
        materialId: src.id,
        nome: src.nome,
        fabricante: src.fabricante,
        unidade: src.unidade,
        custoMat: src.custoMat,
        custoMO: src.custoMO,
      };
    });
    const k2: Kit = { id: nid(), codigo, nome, categoria, itens };
    K[key] = k2;
    return k2;
  }

  const kits: Kit[] = [
    kit("kit-metais-bronze", "KIT-MB", "Metais Bronze", "Metal", ["met-b-001", "met-b-002", "met-b-003", "met-b-004"]),
    kit("kit-piso-barcelona", "KIT-PB", "Piso Barcelona + Soleira + RT", "Piso", ["piso-bcn", "sol-bcn", "rt-bcn"]),
  ];

  function ref(key: string): { baseId: number; isKit: boolean } {
    if (key in K) return { baseId: K[key]!.id, isKit: true };
    return { baseId: M[key]!.id, isKit: false };
  }

  // ── Componente compartilhado (paleta): ids de RoomComponent/opções fixos ──
  interface CompTpl {
    id: number;
    nome: string;
    unidade: Unidade;
    padrao: number | null;
    options: MaterialOption[];
    ghost: boolean;
    ordem: number;
  }
  function comp(
    nome: string,
    unidade: Unidade,
    padraoKey: string | null,
    upgradeKeys: string[],
    ordem: number
  ): CompTpl {
    const rcId = nid();
    const optionKeys = padraoKey ? [padraoKey, ...upgradeKeys] : upgradeKeys;
    const options: MaterialOption[] = optionKeys.map((k, i) => {
      const r = ref(k);
      return { id: nid(), baseId: r.baseId, isKit: r.isKit, isDefault: k === padraoKey, ordem: i };
    });
    const padrao = options.find((o) => o.isDefault)?.id ?? null;
    return { id: rcId, nome, unidade, padrao, options, ghost: false, ordem };
  }

  interface RoomTpl {
    id: number;
    nome: string;
    components: CompTpl[];
  }
  function room(nome: string, components: CompTpl[]): RoomTpl {
    return { id: nid(), nome, components };
  }

  /** Quantitativos de kit desta planta (keyed por KitItem id), alinhado à ordem do kit. */
  function kitQty(kitKey: string, qtys: number[]): Record<number, number> {
    const out: Record<number, number> = {};
    K[kitKey]!.itens.forEach((it, i) => {
      const q = qtys[i];
      if (q !== undefined) out[it.id] = q;
    });
    return out;
  }

  interface PerComp {
    qtd: number;
    rt: number;
    kitQtds?: Record<number, number>;
  }
  /** Instancia um Room numa planta (novo BlueprintRoom + BRC por componente). */
  function inst(tpl: RoomTpl, perComp: PerComp[]): Ambiente {
    const componentes: Componente[] = tpl.components.map((ct, i) => ({
      id: ct.id,
      nome: ct.nome,
      unidade: ct.unidade,
      instanceId: nid(),
      qtd: perComp[i]!.qtd,
      rt: perComp[i]!.rt,
      padrao: ct.padrao,
      options: ct.options,
      ghost: ct.ghost,
      ordem: ct.ordem,
      kitQtds: perComp[i]!.kitQtds ?? {},
    }));
    return { id: tpl.id, blueprintRoomId: nid(), nome: tpl.nome, componentes };
  }

  // ── Sala/Living COMPARTILHADA (1 Room, 3 plantas) ──
  const salaPiso = comp("Piso", "m²", "piso-001", ["piso-002", "piso-003", "piso-004", "kit-piso-barcelona"], 0);
  const salaRodape = comp("Rodapé", "ml", "rod-001", ["rod-002"], 1);
  const sala = room("Sala/Living", [salaPiso, salaRodape]);

  const salaT1 = inst(sala, [
    { qtd: 18.4, rt: 15, kitQtds: kitQty("kit-piso-barcelona", [18.4, 2, 1.84]) },
    { qtd: 16.8, rt: 5 },
  ]);
  const salaT2 = inst(sala, [
    { qtd: 28.4, rt: 15 },
    { qtd: 22.8, rt: 5 },
  ]);
  const salaT3 = inst(sala, [
    { qtd: 36.8, rt: 15, kitQtds: kitQty("kit-piso-barcelona", [36.8, 3, 3.68]) },
    { qtd: 28.4, rt: 5 },
  ]);

  // ── Tipologia 1 — Planta A (86m²) ──
  const t1 = tipologia(nid(), "Planta A — 86m²", 86, "2 dormitórios, sala integrada, cozinha americana, 1 banheiro", 24, "completa", [
    salaT1,
    inst(room("Cozinha", [
      comp("Piso", "m²", "piso-001", ["piso-002"], 0),
      comp("Revestimento parede", "m²", "rev-001", ["rev-002"], 1),
      comp("Pedra bancada", "ml", "ped-001", ["ped-002"], 2),
    ]), [{ qtd: 7.2, rt: 15 }, { qtd: 5.6, rt: 10 }, { qtd: 2.8, rt: 0 }]),
    inst(room("Dormitório 1", [comp("Piso", "m²", "piso-001", ["piso-002"], 0)]), [{ qtd: 10.8, rt: 15 }]),
    inst(room("Dormitório 2", [comp("Piso", "m²", "piso-001", ["piso-002"], 0)]), [{ qtd: 9.6, rt: 15 }]),
    inst(room("Banheiro Social", [
      comp("Piso", "m²", "piso-001", ["piso-002"], 0),
      comp("Revestimento parede", "m²", "rev-001", ["rev-002", "rev-003"], 1),
      comp("Cuba/Louça", "und", "cub-001", ["cub-002"], 2),
      comp("Metais", "und", "met-001", ["met-002", "kit-metais-bronze"], 3),
    ]), [
      { qtd: 3.2, rt: 10 },
      { qtd: 11.8, rt: 10 },
      { qtd: 1, rt: 0 },
      { qtd: 1, rt: 0, kitQtds: kitQty("kit-metais-bronze", [2, 1, 1, 1]) },
    ]),
  ]);

  // ── Tipologia 2 — Planta B (115m²) ──
  const t2 = tipologia(nid(), "Planta B — 115m²", 115, "3 dormitórios (1 suíte master), sala ampla, varanda gourmet, 2 banheiros", 36, "completa", [
    salaT2,
    inst(room("Cozinha", [
      comp("Piso", "m²", "piso-001", ["piso-002"], 0),
      comp("Revestimento parede", "m²", "rev-001", ["rev-002", "rev-003"], 1),
      comp("Pedra bancada", "ml", "ped-001", ["ped-002", "ped-003"], 2),
    ]), [{ qtd: 9.6, rt: 15 }, { qtd: 7.2, rt: 10 }, { qtd: 3.8, rt: 0 }]),
    inst(room("Suíte Master", [comp("Piso", "m²", "piso-001", ["piso-002", "piso-003"], 0)]), [{ qtd: 15.4, rt: 15 }]),
    inst(room("Dormitório 2", [comp("Piso", "m²", "piso-001", ["piso-002"], 0)]), [{ qtd: 11.2, rt: 15 }]),
    inst(room("Dormitório 3", [comp("Piso", "m²", "piso-001", ["piso-002"], 0)]), [{ qtd: 10.8, rt: 15 }]),
    inst(room("Banheiro Suíte", [
      comp("Piso", "m²", "piso-001", ["piso-002", "piso-003"], 0),
      comp("Revestimento parede", "m²", "rev-001", ["rev-002", "rev-003"], 1),
      comp("Cuba/Louça", "und", "cub-001", ["cub-002", "cub-003"], 2),
      comp("Metais", "und", "met-001", ["met-002", "met-003"], 3),
      comp("Pedra bancada", "ml", "ped-001", ["ped-002"], 4),
    ]), [{ qtd: 4.2, rt: 10 }, { qtd: 16.8, rt: 10 }, { qtd: 1, rt: 0 }, { qtd: 1, rt: 0 }, { qtd: 1.2, rt: 0 }]),
    inst(room("Banheiro Social", [
      comp("Piso", "m²", "piso-001", ["piso-002"], 0),
      comp("Revestimento parede", "m²", "rev-001", ["rev-002"], 1),
      comp("Cuba/Louça", "und", "cub-001", ["cub-002"], 2),
      comp("Metais", "und", "met-001", ["met-002"], 3),
    ]), [{ qtd: 3.6, rt: 10 }, { qtd: 14.4, rt: 10 }, { qtd: 1, rt: 0 }, { qtd: 1, rt: 0 }]),
  ]);

  // ── Tipologia 3 — Planta C (142m²) ──
  const nicho = comp("Nicho", "und", null, [], 1);
  const t3 = tipologia(nid(), "Planta C — 142m²", 142, "4 dormitórios (2 suítes), home office, varanda gourmet ampla", 12, "incompleta", [
    salaT3,
    inst(room("Cozinha", [
      comp("Piso", "m²", "piso-001", ["piso-002"], 0),
      comp("Revestimento parede", "m²", "rev-001", ["rev-002", "rev-003"], 1),
      comp("Pedra bancada", "ml", "ped-001", ["ped-002", "ped-003"], 2),
    ]), [{ qtd: 11.2, rt: 15 }, { qtd: 8.8, rt: 10 }, { qtd: 4.6, rt: 0 }]),
    inst(room("Suíte Master", [comp("Piso", "m²", "piso-001", ["piso-002", "piso-003"], 0), nicho]), [{ qtd: 18.6, rt: 15 }, { qtd: 1, rt: 0 }]),
    inst(room("Suíte 2", [comp("Piso", "m²", "piso-001", ["piso-002"], 0)]), [{ qtd: 14.4, rt: 15 }]),
  ]);

  const tipologias: Tipologia[] = [t1, t2, t3];

  // ── Comentários (rowKey = String(optionId)) ──
  function optIdOf(t: Tipologia, ambIdx: number, compIdx: number, baseKey: string): number {
    const opt = t.ambientes[ambIdx]!.componentes[compIdx]!.options.find((o) => o.baseId === ref(baseKey).baseId);
    return opt?.id ?? 0;
  }
  const comments: Record<string, Comment[]> = {
    [String(optIdOf(t2, 0, 0, "piso-002"))]: [
      { autor: "construtora", texto: "Cotação atualizada com base no pedido mínimo de 1000m². Preço válido por 30 dias.", data: "15/05/2026 14:32" },
      { autor: "incorporadora", texto: "OK, mas preciso confirmar o prazo de entrega. Pode garantir para Agosto?", data: "16/05/2026 09:18" },
      { autor: "construtora", texto: "Sim, entrega garantida para 15/08/2026. Confirmo por escrito.", data: "16/05/2026 11:45" },
    ],
    [String(optIdOf(t2, 5, 3, "met-003"))]: [
      { autor: "construtora", texto: "Material importado — preço sujeito à variação cambial. Adicionei buffer de 8%.", data: "14/05/2026 16:20" },
      { autor: "incorporadora", texto: "Entendido. Vamos manter esse valor mas preciso monitorar.", data: "15/05/2026 08:55" },
    ],
  };

  const torres = ["Torre A", "Torre B", "Torre C"];

  const unitGroups = [
    { id: nid(), nome: "Coluna final 01 — Vista Parque", torre: "Torre A", unidades: ["101", "111", "121", "131", "141", "151", "161"] },
    { id: nid(), nome: "Coluna final 02 — Vista Interna", torre: "Torre A", unidades: ["102", "112", "122", "132", "142", "152", "162"] },
    { id: nid(), nome: "Coluna final 03 — Vista Parque", torre: "Torre B", unidades: ["103", "113", "123", "133", "143", "153"] },
    { id: nid(), nome: "Coberturas Duplex", torre: "Torre B", unidades: ["1701", "1702"] },
    { id: nid(), nome: "Garden — Térreo", torre: "Torre C", unidades: ["11", "12", "13", "14"] },
  ];

  const versions: BudgetVersion[] = [
    {
      id: nid(),
      label: "v3",
      createdAt: "04/06/2026 às 14:27",
      createdBy: "Ana Carvalho",
      isCurrent: true,
      summary: "Ajuste de margem incorporadora de 20% para 25%. Adicionadas 3 opções de piso para a Planta A.",
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
      id: nid(),
      label: "v2",
      createdAt: "21/05/2026 às 09:14",
      createdBy: "Ana Carvalho",
      isCurrent: false,
      summary: "Revisão de custos após retorno da Construtora Vertex. 8 itens com custo atualizado.",
      changes: {
        materiais: [],
        custos: [
          { tipo: "alterado", desc: "Granito Negro São Gabriel — R$ 260,00 → R$ 280,00 (+7,7%)" },
          { tipo: "alterado", desc: "Misturador de Cozinha — R$ 420,00 → R$ 480,00 (+14,3%)" },
        ],
        taxas: [],
        tipologias: [{ tipo: "adicionado", desc: "Planta C — Studios adicionada com 2 ambientes e 6 componentes" }],
      },
    },
    {
      id: nid(),
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

  const projects: Project[] = [
    {
      id: nid(),
      nome: "Parque Ibirapuera Residências",
      torre: "Torre Única",
      incorporadora: "Grupo Axis",
      status: "em_revisao",
      enviadoEm: "10/05/2026",
      prazo: "25/05/2026",
      totalItens: 64,
      itensPreenchidos: 50,
      taxColumns: TAX_COLUMNS_DEFAULT.map((c) => ({ ...c })),
    },
    { id: nid(), nome: "Jardins do Tietê", torre: "Torres A e B", incorporadora: "Grupo Axis", status: "publicado", enviadoEm: "12/03/2026", prazo: "28/03/2026", totalItens: 88, itensPreenchidos: 88 },
    { id: nid(), nome: "Residencial Serra Dourada", torre: "Torre 1", incorporadora: "Grupo Axis", status: "em_preenchimento", enviadoEm: "28/05/2026", prazo: "10/06/2026", totalItens: 52, itensPreenchidos: 31 },
    { id: nid(), nome: "Vila Olímpia Towers", torre: "Torres A, B, C", incorporadora: "Grupo Axis", status: "rascunho", enviadoEm: null, prazo: null, totalItens: 0, itensPreenchidos: 0 },
    { id: nid(), nome: "Alameda Santos Prime", torre: "Torre Única", incorporadora: "Grupo Axis", status: "rascunho", enviadoEm: null, prazo: null, totalItens: 0, itensPreenchidos: 0 },
  ];

  return { materiais, kits, tipologias, torres, unitGroups, versions, projects, comments, portalFills: {} };
}

/** Helper local para montar uma Tipologia com id/dados básicos. */
function tipologia(
  id: number,
  nome: string,
  metragem: number,
  descricao: string,
  unidades: number,
  status: Tipologia["status"],
  ambientes: Ambiente[]
): Tipologia {
  return { id, nome, metragem, descricao, unidades, status, ambientes };
}
