// Type guards dos payloads de itens de custo/composição — validação manual,
// como isCustoBaseBody (o projeto não usa zod).
import { isUnidade } from "@/shared/constants/unidades";
import type { ComposicaoOp, CostItemLineInput, CostItemPatch } from "@/shared/types/costItems";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isNonNeg = (v: unknown): v is number => isNum(v) && v >= 0;
const isId = (v: unknown): v is number => Number.isInteger(v);

function isNovo(v: unknown): v is NonNullable<CostItemLineInput["novo"]> {
  if (!isObj(v)) return false;
  if (v.codigo !== null && typeof v.codigo !== "string") return false;
  return typeof v.nome === "string" && isUnidade(v.unidade);
}

export function isCostItemLineInput(v: unknown): v is CostItemLineInput {
  if (!isObj(v)) return false;
  if (v.itemId !== undefined && !isId(v.itemId)) return false;
  if (v.novo !== undefined && !isNovo(v.novo)) return false;
  if (v.itemId === undefined && v.novo === undefined) return false;
  if (v.preco !== undefined && v.preco !== null && !isNonNeg(v.preco)) return false;
  if (v.qtd !== undefined && !isNonNeg(v.qtd)) return false;
  return true;
}

export function isLinesBody(v: unknown): v is { lines: CostItemLineInput[] } {
  return isObj(v) && Array.isArray(v.lines) && v.lines.every(isCostItemLineInput);
}

export function isCostItemPatch(v: unknown): v is CostItemPatch {
  if (!isObj(v)) return false;
  if (v.codigo !== undefined && v.codigo !== null && typeof v.codigo !== "string") return false;
  if (v.nome !== undefined && typeof v.nome !== "string") return false;
  if (v.unidade !== undefined && !isUnidade(v.unidade)) return false;
  if (v.preco !== undefined && v.preco !== null && !isNonNeg(v.preco)) return false;
  return true;
}

export function isComposicaoOp(v: unknown): v is ComposicaoOp {
  if (!isObj(v)) return false;
  switch (v.op) {
    case "addLines":
      return Array.isArray(v.lines) && v.lines.every(isCostItemLineInput);
    case "updateLine":
      return isId(v.lineId) && isNonNeg(v.qtd);
    case "removeLine":
      return isId(v.lineId);
    case "reorder":
      return Array.isArray(v.orderedIds) && v.orderedIds.every(isId);
    case "setCostQuantity":
      return isNonNeg(v.custoQtd);
    case "applyTo":
      return (
        Array.isArray(v.targetBaseIds) &&
        v.targetBaseIds.every(isId) &&
        (v.mode === "substituir" || v.mode === "mesclar") &&
        Array.isArray(v.lines) &&
        v.lines.every((l: unknown) => isObj(l) && isId(l.itemId) && isNonNeg(l.qtd)) &&
        typeof v.copiarCustoQtd === "boolean"
      );
    default:
      return false;
  }
}
