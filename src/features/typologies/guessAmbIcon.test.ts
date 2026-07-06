import { describe, expect, it } from "vitest";

import { AMB_ICON_KEYS, AMB_ICONS, guessAmbIcon } from "./ambIcons";

describe("guessAmbIcon", () => {
  it("heurística por nome (regex do protótipo)", () => {
    expect(guessAmbIcon("Sala/Living")).toBe("sofa");
    expect(guessAmbIcon("Dormitório 2")).toBe("bed");
    expect(guessAmbIcon("Suíte Master")).toBe("bed");
    expect(guessAmbIcon("Cozinha")).toBe("cup");
    expect(guessAmbIcon("Banheiro Social")).toBe("shower");
    expect(guessAmbIcon("Lavabo")).toBe("shower");
    expect(guessAmbIcon("Varanda gourmet")).toBe("plant");
    expect(guessAmbIcon("Closet")).toBe("hanger");
    expect(guessAmbIcon("Home office")).toBe("chair");
    expect(guessAmbIcon("Área de serviço")).toBe("gear");
    expect(guessAmbIcon("Hall de entrada")).toBe("home");
    expect(guessAmbIcon("Depósito")).toBe("apps");
    expect(guessAmbIcon()).toBe("apps");
  });

  it("todas as chaves da grade têm path", () => {
    for (const k of AMB_ICON_KEYS) expect(AMB_ICONS[k]).toBeTruthy();
  });
});
