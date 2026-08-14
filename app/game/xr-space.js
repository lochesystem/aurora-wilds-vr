export const PLAYER_COLLIDER_HALF_HEIGHT = .55;
export const PLAYER_COLLIDER_RADIUS = .38;

export function xrFloorHeight(bodyY) {
  return bodyY - PLAYER_COLLIDER_HALF_HEIGHT - PLAYER_COLLIDER_RADIUS;
}
