import type { Metadata } from "next";
import GameShell from "./game/GameShell";

export const metadata: Metadata = {
  title: "Aurora Wilds VR — Sobrevivência WebXR",
  description: "Explore, corte árvores e minere pedras em realidade virtual no Meta Quest.",
};

export default function Home() {
  return <GameShell />;
}
