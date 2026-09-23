import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { mutationKeys } from "./queryKeys";
import { enqueueWrite, waitForSaves } from "./writeQueue";

/** Deixa TODOS os microtasks pendentes drenarem antes de asserir. */
const tick = () => new Promise((r) => setTimeout(r, 0));

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("enqueueWrite", () => {
  it("serializa writes da MESMA key na ordem de submissão", async () => {
    const order: string[] = [];
    const gate = deferred<void>();

    const p1 = enqueueWrite("serial", async () => {
      order.push("start1");
      await gate.promise;
      order.push("end1");
    });
    const p2 = enqueueWrite("serial", async () => {
      order.push("start2");
    });

    await tick();
    // p2 não pode ter começado enquanto p1 não terminou.
    expect(order).toEqual(["start1"]);

    gate.resolve();
    await Promise.all([p1, p2]);
    expect(order).toEqual(["start1", "end1", "start2"]);
  });

  it("roda keys DIFERENTES em paralelo", async () => {
    const order: string[] = [];
    const gateA = deferred<void>();

    const pA = enqueueWrite("par-a", async () => {
      order.push("startA");
      await gateA.promise;
    });
    const pB = enqueueWrite("par-b", async () => {
      order.push("startB");
    });

    // B termina mesmo com A ainda travada — não há serialização entre keys.
    await pB;
    expect(order).toContain("startB");

    gateA.resolve();
    await pA;
  });

  it("uma falha não trava a próxima write da mesma key", async () => {
    const order: string[] = [];
    const p1 = enqueueWrite("fail", async () => {
      order.push("run1");
      throw new Error("boom");
    });
    const p2 = enqueueWrite("fail", async () => {
      order.push("run2");
    });

    await expect(p1).rejects.toThrow("boom");
    await p2;
    expect(order).toEqual(["run1", "run2"]);
  });
});

describe("waitForSaves", () => {
  /** Dispara uma gravação de preço "em voo" até o teste resolver/rejeitar. */
  function startSave(qc: QueryClient, projectId: number) {
    const gate = deferred<void>();
    const observer = new MutationObserver(qc, {
      mutationKey: mutationKeys.savePricing(projectId),
      mutationFn: () => gate.promise,
    });
    const done = observer.mutate().catch(() => undefined);
    return { gate, done };
  }

  it("resolve 'ok' na hora quando não há nada em voo", async () => {
    await expect(waitForSaves(new QueryClient(), 1)).resolves.toBe("ok");
  });

  it("espera a gravação em voo e resolve 'ok' quando ela grava", async () => {
    const qc = new QueryClient();
    const save = startSave(qc, 1);
    let result: string | null = null;
    const wait = waitForSaves(qc, 1).then((r) => {
      result = r;
    });

    await tick();
    expect(result).toBeNull();

    save.gate.resolve();
    await save.done;
    await wait;
    expect(result).toBe("ok");
  });

  it("resolve 'failed' se uma gravação esperada falhou", async () => {
    const qc = new QueryClient();
    const save = startSave(qc, 1);
    const wait = waitForSaves(qc, 1);

    save.gate.reject(new Error("500"));
    await save.done;
    await expect(wait).resolves.toBe("failed");
  });

  it("ignora gravações de outro empreendimento", async () => {
    const qc = new QueryClient();
    const other = startSave(qc, 2);
    await expect(waitForSaves(qc, 1)).resolves.toBe("ok");
    other.gate.resolve();
    await other.done;
  });

  it("resolve 'timeout' se a gravação não termina no prazo", async () => {
    const qc = new QueryClient();
    const save = startSave(qc, 1);
    await expect(waitForSaves(qc, 1, 20)).resolves.toBe("timeout");
    save.gate.resolve();
    await save.done;
  });
});
