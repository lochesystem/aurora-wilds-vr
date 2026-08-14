import * as THREE from "three";

export type XRTool = "axe" | "pickaxe";

export interface XRLocomotion {
  moveX: number;
  moveY: number;
  snapTurn: number;
}

export interface XRToolSample {
  tool: XRTool;
  position: THREE.Vector3;
  speed: number;
}

interface XRHandRig {
  target: THREE.Group;
  grip: THREE.Group;
  handedness: XRHandedness;
  upperArm: THREE.Mesh;
  forearm: THREE.Mesh;
  hand: THREE.Mesh;
  toolRoot: THREE.Group;
  toolHead: THREE.Object3D;
  previousToolPosition: THREE.Vector3 | null;
}

interface XRCallbacks {
  onSessionStart: () => void;
  onSessionEnd: () => void;
  onToolChanged: (tool: XRTool) => void;
}

const Y_AXIS = new THREE.Vector3(0, 1, 0);

function createLimb(material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(.07, .28, 4, 8), material);
  mesh.castShadow = true;
  mesh.visible = false;
  return mesh;
}

function placeLimb(mesh: THREE.Mesh, start: THREE.Vector3, end: THREE.Vector3) {
  const delta = end.clone().sub(start);
  const length = delta.length();
  mesh.visible = length > .03;
  mesh.position.copy(start).add(end).multiplyScalar(.5);
  mesh.scale.set(1, Math.max(.08, length / .42), 1);
  mesh.quaternion.setFromUnitVectors(Y_AXIS, delta.normalize());
}

function createTool(tool: XRTool) {
  const root = new THREE.Group();
  const wood = new THREE.MeshToonMaterial({ color: 0x765036 });
  const stone = new THREE.MeshToonMaterial({ color: tool === "axe" ? 0x9aa6a0 : 0x879791 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.025, .035, .72, 7), wood);
  shaft.position.y = -.24;
  shaft.castShadow = true;
  root.add(shaft);

  const head = tool === "axe"
    ? new THREE.Mesh(new THREE.BoxGeometry(.34, .19, .09), stone)
    : new THREE.Mesh(new THREE.ConeGeometry(.075, .62, 6), stone);
  head.position.y = -.59;
  head.rotation.z = tool === "axe" ? -.2 : Math.PI / 2;
  head.castShadow = true;
  root.add(head);

  const hitPoint = new THREE.Object3D();
  hitPoint.position.set(tool === "axe" ? .15 : 0, -.6, 0);
  root.add(hitPoint);
  return { root, hitPoint };
}

function strongestAxes(source: XRInputSource | undefined) {
  const axes = source?.gamepad?.axes ?? [];
  if (axes.length >= 4) return { x: axes[2] ?? 0, y: axes[3] ?? 0 };
  return { x: axes[0] ?? 0, y: axes[1] ?? 0 };
}

export class AuroraXR {
  readonly rig = new THREE.Group();
  private hands: XRHandRig[] = [];
  private activeTool: XRTool = "axe";
  private snapReady = true;
  private statusCanvas = document.createElement("canvas");
  private statusTexture = new THREE.CanvasTexture(this.statusCanvas);
  private statusPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(.34, .2),
    new THREE.MeshBasicMaterial({ map: this.statusTexture, transparent: true, side: THREE.DoubleSide }),
  );

  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private callbacks: XRCallbacks,
  ) {
    this.rig.name = "XRPlayerRig";
    this.rig.add(camera);
    this.scene.add(this.rig);
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType("local-floor");
    this.statusCanvas.width = 512;
    this.statusCanvas.height = 300;
    this.statusPanel.rotation.set(-Math.PI / 2, 0, Math.PI);
    this.statusPanel.position.set(0, .07, .08);
    this.statusPanel.visible = false;
    this.setupControllers();
    this.drawStatus(0, 0, 100, 78);
  }

  get presenting() {
    return this.renderer.xr.isPresenting;
  }

  async isSupported() {
    return Boolean(navigator.xr && await navigator.xr.isSessionSupported("immersive-vr"));
  }

  async enter() {
    if (!navigator.xr) throw new Error("WebXR não está disponível neste navegador");
    const session = await navigator.xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
    });
    await this.renderer.xr.setSession(session);
  }

  private setupControllers() {
    const skin = new THREE.MeshToonMaterial({ color: 0xe9b98e });
    const sleeve = new THREE.MeshToonMaterial({ color: 0x4f8f78 });
    for (let index = 0; index < 2; index += 1) {
      const target = this.renderer.xr.getController(index);
      const grip = this.renderer.xr.getControllerGrip(index);
      const upperArm = createLimb(sleeve);
      const forearm = createLimb(skin);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), skin);
      hand.scale.set(.8, 1.15, .75);
      hand.rotation.x = Math.PI / 2;
      hand.visible = false;
      grip.add(hand);

      const toolRoot = new THREE.Group();
      toolRoot.position.set(0, -.015, -.02);
      toolRoot.rotation.set(0, 0, 0);
      grip.add(toolRoot);
      const marker = new THREE.Object3D();
      toolRoot.add(marker);

      const handRig: XRHandRig = {
        target,
        grip,
        handedness: "none",
        upperArm,
        forearm,
        hand,
        toolRoot,
        toolHead: marker,
        previousToolPosition: null,
      };
      this.hands.push(handRig);
      this.rig.add(target, grip, upperArm, forearm);

      target.addEventListener("connected", event => {
        const source = (event as unknown as { data: XRInputSource }).data;
        handRig.handedness = source.handedness;
        hand.visible = true;
        if (source.handedness === "left") {
          grip.add(this.statusPanel);
          this.statusPanel.visible = true;
        }
        this.refreshToolModels();
      });
      target.addEventListener("disconnected", () => {
        hand.visible = false;
        upperArm.visible = false;
        forearm.visible = false;
        handRig.handedness = "none";
        handRig.previousToolPosition = null;
      });
      target.addEventListener("squeezestart", () => {
        if (handRig.handedness !== "right") return;
        this.activeTool = this.activeTool === "axe" ? "pickaxe" : "axe";
        this.refreshToolModels();
        this.callbacks.onToolChanged(this.activeTool);
        this.pulse(.32, 55);
      });
    }

    this.renderer.xr.addEventListener("sessionstart", () => {
      this.camera.position.set(0, 1.65, 0);
      this.callbacks.onSessionStart();
    });
    this.renderer.xr.addEventListener("sessionend", () => {
      this.rig.position.set(0, 0, 0);
      this.rig.rotation.set(0, 0, 0);
      this.hands.forEach(hand => {
        hand.upperArm.visible = false;
        hand.forearm.visible = false;
        hand.previousToolPosition = null;
      });
      this.callbacks.onSessionEnd();
    });
  }

  private refreshToolModels() {
    for (const hand of this.hands) {
      hand.toolRoot.clear();
      const marker = new THREE.Object3D();
      hand.toolRoot.add(marker);
      hand.toolHead = marker;
      hand.previousToolPosition = null;
      if (hand.handedness !== "right") continue;
      const model = createTool(this.activeTool);
      hand.toolRoot.add(model.root);
      hand.toolHead = model.hitPoint;
    }
  }

  syncPlayer(bodyPosition: { x: number; y: number; z: number }) {
    if (!this.presenting) return;
    this.rig.position.set(bodyPosition.x, bodyPosition.y - 2.2, bodyPosition.z);
  }

  readLocomotion(): XRLocomotion {
    const sources = Array.from(this.renderer.xr.getSession()?.inputSources ?? []);
    const left = strongestAxes(sources.find(source => source.handedness === "left"));
    const right = strongestAxes(sources.find(source => source.handedness === "right"));
    const magnitude = Math.hypot(left.x, left.y);
    const dead = .16;
    const scale = magnitude <= dead ? 0 : Math.min(1, (magnitude - dead) / (1 - dead)) / Math.max(magnitude, .001);

    let snapTurn = 0;
    if (Math.abs(right.x) > .72 && this.snapReady) {
      snapTurn = right.x > 0 ? -Math.PI / 6 : Math.PI / 6;
      this.snapReady = false;
    } else if (Math.abs(right.x) < .35) this.snapReady = true;

    if (snapTurn) this.rig.rotation.y += snapTurn;
    return { moveX: left.x * scale, moveY: left.y * scale, snapTurn };
  }

  movementBasis() {
    const forward = this.camera.getWorldDirection(new THREE.Vector3());
    forward.y = 0;
    if (forward.lengthSq() < .001) forward.set(0, 0, -1);
    forward.normalize();
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    return { forward, right };
  }

  updateArms() {
    if (!this.presenting) return;
    const headPosition = this.camera.getWorldPosition(new THREE.Vector3());
    const headQuaternion = this.camera.getWorldQuaternion(new THREE.Quaternion());
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(headQuaternion).setY(0).normalize();
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    for (const hand of this.hands) {
      if (hand.handedness === "none" || !hand.grip.visible) continue;
      const side = hand.handedness === "left" ? -1 : 1;
      const shoulderWorld = headPosition.clone()
        .addScaledVector(right, side * .2)
        .addScaledVector(forward, .035)
        .add(new THREE.Vector3(0, -.24, 0));
      const handWorld = hand.grip.getWorldPosition(new THREE.Vector3());
      const elbowWorld = shoulderWorld.clone().lerp(handWorld, .53)
        .addScaledVector(right, side * .085)
        .add(new THREE.Vector3(0, -.08, 0));
      const shoulder = this.rig.worldToLocal(shoulderWorld.clone());
      const elbow = this.rig.worldToLocal(elbowWorld.clone());
      const wrist = this.rig.worldToLocal(handWorld.clone());
      placeLimb(hand.upperArm, shoulder, elbow);
      placeLimb(hand.forearm, elbow, wrist);
    }
  }

  sampleTool(dt: number): XRToolSample | null {
    if (!this.presenting || dt <= 0) return null;
    const hand = this.hands.find(candidate => candidate.handedness === "right");
    if (!hand || !hand.hand.visible) return null;
    const position = hand.toolHead.getWorldPosition(new THREE.Vector3());
    const speed = hand.previousToolPosition ? position.distanceTo(hand.previousToolPosition) / dt : 0;
    hand.previousToolPosition = position.clone();
    return { tool: this.activeTool, position, speed };
  }

  pulse(intensity = .55, duration = 80) {
    const source = Array.from(this.renderer.xr.getSession()?.inputSources ?? [])
      .find(candidate => candidate.handedness === "right");
    const actuator = source?.gamepad?.hapticActuators?.[0];
    void actuator?.pulse(intensity, duration).catch(() => undefined);
  }

  drawStatus(wood: number, stone: number, health: number, hunger: number) {
    const context = this.statusCanvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, 512, 300);
    context.fillStyle = "rgba(7, 28, 30, .94)";
    context.fillRect(0, 0, 512, 300);
    context.strokeStyle = "#78dfbd";
    context.lineWidth = 8;
    context.strokeRect(6, 6, 500, 288);
    context.fillStyle = "#eff8dc";
    context.font = "700 44px sans-serif";
    context.fillText(this.activeTool === "axe" ? "MACHADO" : "PICARETA", 28, 62);
    context.font = "600 34px sans-serif";
    context.fillStyle = "#d3b17a";
    context.fillText(`MADEIRA  ${wood}`, 28, 122);
    context.fillStyle = "#b8c4bd";
    context.fillText(`PEDRA    ${stone}`, 28, 168);
    context.fillStyle = "#ff7869";
    context.fillText(`VIDA     ${health}`, 28, 214);
    context.fillStyle = "#efc362";
    context.fillText(`FOME     ${hunger}`, 28, 258);
    this.statusTexture.needsUpdate = true;
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.scene.remove(this.rig);
    this.statusPanel.geometry.dispose();
    (this.statusPanel.material as THREE.Material).dispose();
    this.statusTexture.dispose();
  }
}
