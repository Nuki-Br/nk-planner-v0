import { describe, expect, it } from "vitest";

import {
  ACCEPTED_MEDIA_MIME_TYPES,
  humanFileSize,
  isAcceptedMediaMimeType,
  isImageMimeType,
} from "./media";

describe("humanFileSize", () => {
  it("formata bytes sem casa decimal", () => {
    expect(humanFileSize("0")).toBe("0 B");
    expect(humanFileSize("512")).toBe("512 B");
  });

  it("formata múltiplos de 1024 com uma casa", () => {
    expect(humanFileSize("1536")).toBe("1.5 KB");
    expect(humanFileSize("1048576")).toBe("1.0 MB");
    expect(humanFileSize("1099511627776")).toBe("1.0 TB");
  });

  it("aceita number e bigint, não só string", () => {
    expect(humanFileSize(1536)).toBe("1.5 KB");
    expect(humanFileSize(BigInt(1536))).toBe("1.5 KB");
  });

  it("não lança em string inválida (BigInt('abc') lançaria SyntaxError)", () => {
    expect(() => humanFileSize("abc")).not.toThrow();
    expect(humanFileSize("abc")).toBe("0 B");
    expect(humanFileSize("")).toBe("0 B");
    expect(humanFileSize("1.5")).toBe("0 B");
  });

  it("zero e negativo viram 0 B", () => {
    expect(humanFileSize(0)).toBe("0 B");
    expect(humanFileSize(-5)).toBe("0 B");
    expect(humanFileSize(Number.NaN)).toBe("0 B");
  });

  it("valor acima de MAX_SAFE_INTEGER não quebra", () => {
    const huge = (BigInt(Number.MAX_SAFE_INTEGER) * BigInt(1000)).toString();
    expect(() => humanFileSize(huge)).not.toThrow();
    expect(humanFileSize(huge)).toMatch(/TB$/);
  });

  it("clampa na maior unidade quando o expoente estoura a tabela", () => {
    // 1024^8 daria expoente 8, além do fim de BYTE_UNITS. Guarda de regressão:
    // se alguém tirar o Math.min, o retorno vira "X undefined".
    const beyondTB = (BigInt(1024) ** BigInt(8)).toString();
    expect(humanFileSize(beyondTB)).not.toContain("undefined");
    expect(humanFileSize(beyondTB)).toMatch(/TB$/);
  });
});

describe("isAcceptedMediaMimeType", () => {
  it("aceita todos os tipos do contrato", () => {
    for (const mime of ACCEPTED_MEDIA_MIME_TYPES) {
      expect(isAcceptedMediaMimeType(mime)).toBe(true);
    }
  });

  it("rejeita image/x-icon — o contrato lista 'image/ico', que não é MIME real", () => {
    // Documentado para ninguém debugar duas vezes: navegadores mandam
    // "image/x-icon", então .ico é rejeitado na prática.
    expect(isAcceptedMediaMimeType("image/ico")).toBe(true);
    expect(isAcceptedMediaMimeType("image/x-icon")).toBe(false);
  });

  it("rejeita tipos fora da lista", () => {
    expect(isAcceptedMediaMimeType("application/zip")).toBe(false);
    expect(isAcceptedMediaMimeType("video/mp4")).toBe(false);
    expect(isAcceptedMediaMimeType("")).toBe(false);
  });

  it("é case-sensitive", () => {
    expect(isAcceptedMediaMimeType("IMAGE/JPEG")).toBe(false);
  });
});

describe("isImageMimeType", () => {
  it("reconhece imagens pelo prefixo", () => {
    expect(isImageMimeType("image/png")).toBe(true);
    expect(isImageMimeType("image/svg+xml")).toBe(true);
  });

  it("rejeita não-imagens", () => {
    expect(isImageMimeType("application/pdf")).toBe(false);
    expect(isImageMimeType("image")).toBe(false);
    expect(isImageMimeType("")).toBe(false);
  });
});
