// Regras puras do Media Center — sem Prisma, sem Supabase, sem I/O.
//
// Este módulo é deliberadamente livre de dependências para poder ser testado
// direto (o Vitest não carrega .env.local, então um `new PrismaClient()` em
// import-time quebraria o teste) e para que store.ts possa importar
// resolveMediaUrl sem puxar a camada de storage junto.
//
// Nota de shape: as funções de árvore operam sobre LINHAS do banco (PascalCase,
// FolderNode) porque rodam dentro da transação, antes do mapper. buildFolderTree
// opera sobre DTOs (camelCase) porque roda depois. Não é inconsistência: são
// dois pontos diferentes do pipeline.
import type {
  FolderTreeNodeDto,
  MediaFileStatus,
  MediaFolderDto,
} from "@/shared/types/media";

/**
 * Teto de níveis de pasta (contado a partir de 1), conforme o contrato.
 * O campo Depth é 0-based, então a profundidade máxima VÁLIDA é
 * MAX_FOLDER_DEPTH - 1 = 4. Invariante único de todas as guardas abaixo:
 *
 *     depth do nó mais fundo <= MAX_FOLDER_DEPTH - 1
 */
export const MAX_FOLDER_DEPTH = 5;

/** Profundidade 0-based máxima que uma pasta pode ter. */
export const MAX_FOLDER_DEPTH_INDEX = MAX_FOLDER_DEPTH - 1;

/** Linha de pasta reduzida ao necessário para navegar a árvore. */
export interface FolderNode {
  Id: number;
  ParentFolderId: number | null;
}

// ─── Slug ───────────────────────────────────────────────────────────────

/**
 * Nome → slug: minúsculo, sem acento, não-alfanumérico vira hífen.
 * Read-only para o cliente (o contrato define que o backend gera).
 */
export function slugifyFolderName(name: string): string {
  const slug = name
    .normalize("NFD")
    // Combining Diacritical Marks: o NFD separa "ç" em "c" + cedilha, e este
    // range remove a cedilha. Escapado de propósito — o literal é invisível.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // Um nome só de símbolos ("!!!") colapsaria para "" — o slug nunca é vazio.
  return slug || "pasta";
}

// ─── Navegação da árvore ────────────────────────────────────────────────

/** Índice ParentFolderId → ids dos filhos diretos. */
function indexChildren(rows: FolderNode[]): Map<number, number[]> {
  const childrenBy = new Map<number, number[]>();
  for (const row of rows) {
    if (row.ParentFolderId === null) continue;
    const siblings = childrenBy.get(row.ParentFolderId);
    if (siblings) siblings.push(row.Id);
    else childrenBy.set(row.ParentFolderId, [row.Id]);
  }
  return childrenBy;
}

/**
 * Ids da subárvore inteira, INCLUINDO a raiz.
 *
 * Incluir a raiz é o que faz a guarda de ciclo sair de graça: mover uma pasta
 * para dentro de si mesma é só `collectSubtreeIds(rows, id).includes(target)`.
 *
 * Termina mesmo com cadeia de parent corrompida (ciclo), via `seen`.
 */
export function collectSubtreeIds(rows: FolderNode[], rootId: number): number[] {
  const childrenBy = indexChildren(rows);
  const ids: number[] = [];
  const seen = new Set<number>();
  const stack: number[] = [rootId];

  while (stack.length > 0) {
    const id = stack.pop();
    if (id === undefined || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    const children = childrenBy.get(id);
    if (children) stack.push(...children);
  }
  return ids;
}

/**
 * Altura RELATIVA da subárvore: folha = 0, pai de folha = 1, etc.
 * É o quanto a subárvore "afunda" abaixo da própria raiz — o que precisa ser
 * somado à profundidade de destino para validar um move.
 */
export function subtreeHeight(rows: FolderNode[], rootId: number): number {
  const childrenBy = indexChildren(rows);
  let height = 0;
  const seen = new Set<number>();
  const stack: Array<{ id: number; depth: number }> = [{ id: rootId, depth: 0 }];

  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined || seen.has(node.id)) continue;
    seen.add(node.id);
    if (node.depth > height) height = node.depth;
    const children = childrenBy.get(node.id);
    if (children) {
      for (const child of children) stack.push({ id: child, depth: node.depth + 1 });
    }
  }
  return height;
}

/** Profundidade que uma pasta terá sob `parentDepth` (null = raiz → 0). */
export function depthUnder(parentDepth: number | null): number {
  return parentDepth === null ? 0 : parentDepth + 1;
}

/** Uma pasta nesta profundidade cabe no teto? */
export function fitsDepth(depth: number): boolean {
  return depth <= MAX_FOLDER_DEPTH_INDEX;
}

/**
 * Um move cabe no teto? `height` é a altura da subárvore movida, então o nó
 * mais fundo pousa em `newDepth + height`.
 */
export function moveFitsDepth(newDepth: number, height: number): boolean {
  return newDepth + height <= MAX_FOLDER_DEPTH_INDEX;
}

/**
 * Lista plana → floresta aninhada a partir de `rootParentId`.
 * Nós cujo pai não está na lista (órfãos) são descartados.
 */
export function buildFolderTree(
  rows: MediaFolderDto[],
  rootParentId: number | null
): FolderTreeNodeDto[] {
  const nodeById = new Map<number, FolderTreeNodeDto>();
  for (const row of rows) {
    nodeById.set(row.id, {
      id: row.id,
      parentFolderId: row.parentFolderId,
      name: row.name,
      slug: row.slug,
      depth: row.depth,
      children: [],
    });
  }

  const roots: FolderTreeNodeDto[] = [];
  for (const row of rows) {
    const node = nodeById.get(row.id);
    if (!node) continue;

    if (row.parentFolderId === rootParentId) {
      roots.push(node);
      continue;
    }
    const parent =
      row.parentFolderId === null ? undefined : nodeById.get(row.parentFolderId);
    if (parent) parent.children.push(node);
    // sem pai na lista e não é raiz → órfão, descartado
  }
  return roots;
}

// ─── Resolução de URL ───────────────────────────────────────────────────

/** Linha de MediaFile reduzida ao necessário para resolver a URL. */
export interface MediaUrlSource {
  PublicUrl: string | null;
  PublicOptimizedUrl: string | null;
  Status: MediaFileStatus;
}

/**
 * URL de imagem de uma entidade: MediaFile vinculado vence a coluna legada.
 *
 * O gate em `Status === "Active"` é load-bearing, não defensivo: o delete de
 * arquivo é SOFT (a linha e as FKs sobrevivem) mas o objeto some do bucket.
 * Sem o gate, uma entidade com MediaFile excluído renderizaria URL morta em vez
 * de cair no fallback legado. Pending idem — o binário ainda não subiu.
 */
export function resolveMediaUrl(
  media: MediaUrlSource | null | undefined,
  legacyUrl: string | null
): string | null {
  if (media && media.Status === "Active") {
    return media.PublicOptimizedUrl ?? media.PublicUrl ?? legacyUrl;
  }
  return legacyUrl;
}
