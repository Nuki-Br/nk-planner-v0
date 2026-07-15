import { describe, expect, it } from "vitest";

import type { MediaFolderDto } from "@/shared/types/media";

import {
  buildFolderTree,
  collectSubtreeIds,
  depthUnder,
  fitsDepth,
  MAX_FOLDER_DEPTH_INDEX,
  moveFitsDepth,
  resolveMediaUrl,
  slugifyFolderName,
  subtreeHeight,
  type FolderNode,
  type MediaUrlSource,
} from "./mediaRules";

// Árvore de apoio:
//   A(1) ── B(2) ── C(3) ── D(4)
//        └─ E(5)
//   F(6)  (raiz irmã, fora da subárvore de A)
const TREE: FolderNode[] = [
  { Id: 1, ParentFolderId: null },
  { Id: 2, ParentFolderId: 1 },
  { Id: 3, ParentFolderId: 2 },
  { Id: 4, ParentFolderId: 3 },
  { Id: 5, ParentFolderId: 1 },
  { Id: 6, ParentFolderId: null },
];

describe("slugifyFolderName", () => {
  it("minúsculo com hífen no lugar do espaço", () => {
    expect(slugifyFolderName("Plantas 2024")).toBe("plantas-2024");
  });

  it("remove acentos", () => {
    expect(slugifyFolderName("Ãmbiente Ção")).toBe("ambiente-cao");
    expect(slugifyFolderName("Área Útil")).toBe("area-util");
  });

  it("colapsa separadores e apara as pontas", () => {
    expect(slugifyFolderName("  a  b  ")).toBe("a-b");
    expect(slugifyFolderName("a---b")).toBe("a-b");
  });

  it("nunca devolve slug vazio", () => {
    expect(slugifyFolderName("!!!")).toBe("pasta");
    expect(slugifyFolderName("")).toBe("pasta");
    expect(slugifyFolderName("   ")).toBe("pasta");
  });
});

describe("collectSubtreeIds", () => {
  it("inclui a própria raiz", () => {
    expect(collectSubtreeIds(TREE, 4)).toEqual([4]);
  });

  it("pega a subárvore inteira", () => {
    expect(collectSubtreeIds(TREE, 1).sort()).toEqual([1, 2, 3, 4, 5]);
    expect(collectSubtreeIds(TREE, 2).sort()).toEqual([2, 3, 4]);
  });

  it("não vaza para irmãos nem para outras raízes", () => {
    expect(collectSubtreeIds(TREE, 2)).not.toContain(5);
    expect(collectSubtreeIds(TREE, 1)).not.toContain(6);
  });

  it("termina com cadeia de parent cíclica (dado corrompido)", () => {
    const cyclic: FolderNode[] = [
      { Id: 1, ParentFolderId: 2 },
      { Id: 2, ParentFolderId: 1 },
    ];
    expect(collectSubtreeIds(cyclic, 1).sort()).toEqual([1, 2]);
  });
});

describe("subtreeHeight", () => {
  it("folha tem altura 0", () => {
    expect(subtreeHeight(TREE, 4)).toBe(0);
    expect(subtreeHeight(TREE, 5)).toBe(0);
  });

  it("mede o ramo mais fundo", () => {
    expect(subtreeHeight(TREE, 1)).toBe(3); // A→B→C→D
    expect(subtreeHeight(TREE, 2)).toBe(2); // B→C→D
  });

  it("termina com cadeia cíclica", () => {
    const cyclic: FolderNode[] = [
      { Id: 1, ParentFolderId: 2 },
      { Id: 2, ParentFolderId: 1 },
    ];
    expect(() => subtreeHeight(cyclic, 1)).not.toThrow();
  });
});

describe("guardas de profundidade", () => {
  it("a profundidade 0-based máxima é 4 (teto de 5 níveis)", () => {
    expect(MAX_FOLDER_DEPTH_INDEX).toBe(4);
  });

  it("depthUnder: raiz é 0, filho é pai+1", () => {
    expect(depthUnder(null)).toBe(0);
    expect(depthUnder(0)).toBe(1);
    expect(depthUnder(3)).toBe(4);
  });

  it("criar cabe até a profundidade 4 e estoura na 5", () => {
    expect(fitsDepth(depthUnder(3))).toBe(true); // vira depth 4 — o mais fundo válido
    expect(fitsDepth(depthUnder(4))).toBe(false); // viraria depth 5
  });

  it("mover considera a altura da subárvore, não só a pasta", () => {
    // Uma pasta folha (altura 0) cabe até em depth 4.
    expect(moveFitsDepth(4, 0)).toBe(true);
    expect(moveFitsDepth(4, 1)).toBe(false);

    // Subárvore de altura 2: o nó mais fundo pousa em newDepth + 2.
    expect(moveFitsDepth(2, 2)).toBe(true); // mais fundo em 4 — ok
    expect(moveFitsDepth(3, 2)).toBe(false); // mais fundo em 5 — estoura
  });
});

describe("buildFolderTree", () => {
  const dto = (
    id: number,
    parentFolderId: number | null,
    depth: number
  ): MediaFolderDto => ({
    id,
    organizationId: "org-1",
    parentFolderId,
    name: `Pasta ${id}`,
    slug: `pasta-${id}`,
    depth,
    createdAt: "2026-07-15T00:00:00.000Z",
    updatedAt: "2026-07-15T00:00:00.000Z",
  });

  it("aninha uma lista plana a partir da raiz", () => {
    const tree = buildFolderTree([dto(1, null, 0), dto(2, 1, 1), dto(3, 2, 2)], null);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.id).toBe(1);
    expect(tree[0]?.children[0]?.id).toBe(2);
    expect(tree[0]?.children[0]?.children[0]?.id).toBe(3);
  });

  it("aninha a partir de uma pasta intermediária", () => {
    const tree = buildFolderTree([dto(2, 1, 1), dto(3, 2, 2)], 1);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.id).toBe(2);
    expect(tree[0]?.children[0]?.id).toBe(3);
  });

  it("descarta órfãos (pai fora da lista)", () => {
    const tree = buildFolderTree([dto(1, null, 0), dto(9, 99, 1)], null);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.id).toBe(1);
    expect(tree[0]?.children).toHaveLength(0);
  });

  it("múltiplas raízes viram uma floresta", () => {
    const tree = buildFolderTree([dto(1, null, 0), dto(6, null, 0)], null);
    expect(tree.map((n) => n.id).sort()).toEqual([1, 6]);
  });
});

describe("resolveMediaUrl", () => {
  const media = (
    Status: MediaUrlSource["Status"],
    PublicUrl: string | null = "https://cdn/ativo.png",
    PublicOptimizedUrl: string | null = null
  ): MediaUrlSource => ({ Status, PublicUrl, PublicOptimizedUrl });

  const LEGACY = "https://legado/antiga.png";

  it("MediaFile ativo vence a coluna legada", () => {
    expect(resolveMediaUrl(media("Active"), LEGACY)).toBe("https://cdn/ativo.png");
  });

  it("a URL otimizada vence a pública", () => {
    const m = media("Active", "https://cdn/ativo.png", "https://cdn/ativo.webp");
    expect(resolveMediaUrl(m, LEGACY)).toBe("https://cdn/ativo.webp");
  });

  it("arquivo excluído cai no fallback legado (o binário não existe mais)", () => {
    expect(resolveMediaUrl(media("Deleted"), LEGACY)).toBe(LEGACY);
  });

  it("arquivo pendente cai no fallback legado (o binário ainda não subiu)", () => {
    expect(resolveMediaUrl(media("Pending", null), LEGACY)).toBe(LEGACY);
  });

  it("sem MediaFile vinculado, usa a legada", () => {
    expect(resolveMediaUrl(null, LEGACY)).toBe(LEGACY);
    expect(resolveMediaUrl(undefined, LEGACY)).toBe(LEGACY);
  });

  it("ativo mas sem URL nenhuma cai na legada", () => {
    expect(resolveMediaUrl(media("Active", null), LEGACY)).toBe(LEGACY);
  });

  it("sem nada resolve para null", () => {
    expect(resolveMediaUrl(null, null)).toBeNull();
    expect(resolveMediaUrl(media("Deleted"), null)).toBeNull();
    expect(resolveMediaUrl(media("Active", null), null)).toBeNull();
  });
});
