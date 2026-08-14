export function canXRHarvest({ resourceKind, tool, speed, distance, durability, cooldown }) {
  if (resourceKind !== "wood" && resourceKind !== "stone") return false;
  if (resourceKind === "wood" && tool !== "axe") return false;
  if (resourceKind === "stone" && tool !== "pickaxe") return false;
  return durability > 0 && cooldown <= 0 && speed >= .9 && distance < .82;
}
