import test from "node:test";
import assert from "node:assert/strict";
import {
  PLAYER_COLLIDER_HALF_HEIGHT,
  PLAYER_COLLIDER_RADIUS,
  xrFloorHeight,
} from "../app/game/xr-space.js";

test("o piso XR acompanha a base real do collider", () => {
  const terrainY = 4.25;
  const settledBodyY = terrainY + PLAYER_COLLIDER_HALF_HEIGHT + PLAYER_COLLIDER_RADIUS;
  assert.equal(xrFloorHeight(settledBodyY), terrainY);
});
