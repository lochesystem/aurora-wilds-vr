import test from "node:test";
import assert from "node:assert/strict";
import { canXRHarvest } from "../app/game/xr-harvesting.js";

const hit = { speed: 2.4, distance: .35, durability: 80, cooldown: 0 };

test("machado corta madeira com um golpe físico válido", () => {
  assert.equal(canXRHarvest({ ...hit, resourceKind: "wood", tool: "axe" }), true);
});

test("picareta minera pedra com um golpe físico válido", () => {
  assert.equal(canXRHarvest({ ...hit, resourceKind: "stone", tool: "pickaxe" }), true);
});

test("ferramenta errada, movimento lento e cooldown não coletam", () => {
  assert.equal(canXRHarvest({ ...hit, resourceKind: "wood", tool: "pickaxe" }), false);
  assert.equal(canXRHarvest({ ...hit, resourceKind: "stone", tool: "pickaxe", speed: .4 }), false);
  assert.equal(canXRHarvest({ ...hit, resourceKind: "stone", tool: "pickaxe", cooldown: .1 }), false);
});
