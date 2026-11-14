import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import {
  Grid,
  Line,
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
  Text,
  TransformControls,
} from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { COURT_STANDARDS, formatArea, formatLength } from '../constants/courtStandards';
import {
  CameraPreset,
  CameraProjection,
  CameraSettings,
  CourtProject,
  LightingMode,
  RenderMode,
  SceneObject,
  SurroundingsPreset,
  ToolMode,
} from '../types/court';
import {
  createBoundaryLinesGeometry,
  createCentreFillGeometry,
  createCentreLinesGeometry,
  createFreeThrowGeometries,
  createThreePointLinesGeometry,
} from './courtGeometry';
import { createSurfaceTexture } from './courtTextures';

// Reusable scratch vectors to eliminate per-frame GC allocations
const _desiredPos = new THREE.Vector3();
const _desiredTarget = new THREE.Vector3();

const detectSoftwareGl = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
};

const StudioEnvironment: React.FC = () => {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    return () => {
      scene.environment = null;
      envTarget.dispose();
      roomEnv.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  return null;
};

interface CameraRigProps {
  preset: CameraPreset;
  projection: CameraProjection;
  presetVersion: number;
  initialCamera?: CameraSettings;
  courtLength: number;
  courtWidth: number;
  isSoftwareGl: boolean;
  orbitEnabled: boolean;
  onCameraSettled?: (settings: Partial<CameraSettings>) => void;
}

const CameraRig: React.FC<CameraRigProps> = ({
  preset,
  projection,
  presetVersion,
  initialCamera,
  courtLength,
  courtWidth,
  isSoftwareGl,
  orbitEnabled,
  onCameraSettled,
}) => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const perspRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orthoRef = useRef<THREE.OrthographicCamera | null>(null);
  const { size, invalidate } = useThree();

  const initializedRef = useRef(false);
  const transitionActive = useRef(false);
  const desiredZoom = useRef(initialCamera?.zoom ?? 24);

  useEffect(() => {
    if (!initializedRef.current && initialCamera && presetVersion === 0) {
      initializedRef.current = true;
      const activeCam = projection === 'orthographic' ? orthoRef.current : perspRef.current;
      if (activeCam) {
        activeCam.position.set(...initialCamera.position);
      }
      if (controlsRef.current) {
        controlsRef.current.target.set(...initialCamera.target);
        controlsRef.current.update();
      }
      invalidate();
      return;
    }
    initializedRef.current = true;

    const span = Math.max(courtLength, courtWidth);
    if (preset === 'top') {
      _desiredPos.set(0, span * 1.25, 0.01);
      _desiredTarget.set(0, 0, 0);
    } else if (preset === 'front') {
      _desiredPos.set(-(courtLength / 2 + 12.5), 3.6, 0);
      _desiredTarget.set(0, 1.5, 0);
    } else if (preset === 'side') {
      _desiredPos.set(0, 4.4, courtWidth / 2 + 16.5);
      _desiredTarget.set(0, 1.4, 0);
    } else {
      _desiredPos.set(span * 0.68, span * 0.46, span * 0.74);
      _desiredTarget.set(0, 0.6, 0);
    }

    const fitZoom = Math.max(12, Math.min(size.width, size.height) / (span * 1.15));
    desiredZoom.current = fitZoom;
    transitionActive.current = true;
    invalidate();
  }, [preset, presetVersion, courtLength, courtWidth, size.width, size.height, invalidate]);

  useEffect(() => {
    const fromCam = projection === 'orthographic' ? perspRef.current : orthoRef.current;
    const toCam = projection === 'orthographic' ? orthoRef.current : perspRef.current;
    if (fromCam && toCam) {
      toCam.position.copy(fromCam.position);
      toCam.quaternion.copy(fromCam.quaternion);
    }
    if (projection === 'orthographic' && orthoRef.current) {
      const span = Math.max(courtLength, courtWidth);
      orthoRef.current.zoom = Math.max(14, Math.min(size.width, size.height) / (span * 1.2));
      orthoRef.current.updateProjectionMatrix();
    }
    controlsRef.current?.update();
    invalidate();
  }, [projection, courtLength, courtWidth, size.width, size.height, invalidate]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    const activeCam = projection === 'orthographic' ? orthoRef.current : perspRef.current;
    if (!controls || !activeCam) return;

    if (transitionActive.current) {
      const lambda = 7.5;
      activeCam.position.x = THREE.MathUtils.damp(activeCam.position.x, _desiredPos.x, lambda, delta);
      activeCam.position.y = THREE.MathUtils.damp(activeCam.position.y, _desiredPos.y, lambda, delta);
      activeCam.position.z = THREE.MathUtils.damp(activeCam.position.z, _desiredPos.z, lambda, delta);

      controls.target.x = THREE.MathUtils.damp(controls.target.x, _desiredTarget.x, lambda, delta);
      controls.target.y = THREE.MathUtils.damp(controls.target.y, _desiredTarget.y, lambda, delta);
      controls.target.z = THREE.MathUtils.damp(controls.target.z, _desiredTarget.z, lambda, delta);

      if (projection === 'orthographic' && orthoRef.current) {
        orthoRef.current.zoom = THREE.MathUtils.damp(
          orthoRef.current.zoom,
          desiredZoom.current,
          lambda,
          delta
        );
        orthoRef.current.updateProjectionMatrix();
      }

      if (activeCam.position.distanceTo(_desiredPos) < 0.04) {
        transitionActive.current = false;
      }
      controls.update();
      invalidate();
    }
  });

  const handleOrbitEnd = () => {
    if (!onCameraSettled || !controlsRef.current) return;
    const activeCam = projection === 'orthographic' ? orthoRef.current : perspRef.current;
    if (!activeCam) return;
    onCameraSettled({
      preset,
      projection,
      position: [
        Number(activeCam.position.x.toFixed(2)),
        Number(activeCam.position.y.toFixed(2)),
        Number(activeCam.position.z.toFixed(2)),
      ],
      target: [
        Number(controlsRef.current.target.x.toFixed(2)),
        Number(controlsRef.current.target.y.toFixed(2)),
        Number(controlsRef.current.target.z.toFixed(2)),
      ],
      zoom: orthoRef.current ? Number(orthoRef.current.zoom.toFixed(1)) : 24,
    });
  };

  return (
    <>
      <PerspectiveCamera
        ref={perspRef}
        makeDefault={projection === 'perspective'}
        fov={44}
        near={0.2}
        far={280}
        position={initialCamera?.position ?? [19, 13, 21]}
      />
      <OrthographicCamera
        ref={orthoRef}
        makeDefault={projection === 'orthographic'}
        near={-120}
        far={280}
        zoom={initialCamera?.zoom ?? 24}
        position={initialCamera?.position ?? [19, 13, 21]}
      />
      <OrbitControls
        key={projection}
        ref={controlsRef}
        makeDefault
        enabled={orbitEnabled}
        enableDamping={!isSoftwareGl}
        dampingFactor={0.07}
        enableRotate
        enableZoom
        enablePan
        screenSpacePanning
        minPolarAngle={0.02}
        maxPolarAngle={Math.PI / 2 - 0.02}
        minDistance={3}
        maxDistance={105}
        minZoom={6}
        maxZoom={140}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
        onStart={() => {
          transitionActive.current = false;
        }}
        onChange={() => invalidate()}
        onEnd={handleOrbitEnd}
      />
    </>
  );
};

const SelectionRing: React.FC<{ selected: boolean; radius?: number }> = ({
  selected,
  radius = 1.2,
}) => {
  if (!selected) return null;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <ringGeometry args={[radius, radius + 0.09, 48]} />
      <meshBasicMaterial color="#F07827" side={THREE.DoubleSide} />
    </mesh>
  );
};

/**
 * Interactive Wrapper: Attaches TransformControls when object is selected & Move/Rotate tool is active.
 */
interface SelectableTransformProps {
  obj: SceneObject;
  isSelected: boolean;
  toolMode: ToolMode;
  onSelect: (id: string) => void;
  onDraggingChange: (dragging: boolean) => void;
  onTransformCommit?: (id: string, pos: [number, number, number], rotY: number) => void;
  children: React.ReactNode;
}

const SelectableObjectGroup: React.FC<SelectableTransformProps> = ({
  obj,
  isSelected,
  toolMode,
  onSelect,
  onDraggingChange,
  onTransformCommit,
  children,
}) => {
  const [groupNode, setGroupNode] = useState<THREE.Group | null>(null);
  const { invalidate } = useThree();
  const showGizmo =
    isSelected && !obj.locked && (toolMode === 'move' || toolMode === 'rotate') && obj.visible;

  return (
    <>
      <group
        ref={setGroupNode}
        position={obj.position}
        rotation={[0, obj.rotationY, 0]}
        visible={obj.visible}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect(obj.id);
        }}
      >
        {children}
      </group>

      {showGizmo && groupNode && (
        <TransformControls
          object={groupNode}
          mode={toolMode === 'rotate' ? 'rotate' : 'translate'}
          showY={toolMode === 'move' ? obj.type === 'scoreboard' : true}
          showX={toolMode === 'move'}
          showZ={toolMode === 'move'}
          size={0.78}
          onChange={() => invalidate()}
          onMouseDown={() => onDraggingChange(true)}
          onMouseUp={() => {
            onDraggingChange(false);
            if (onTransformCommit) {
              const p = groupNode.position;
              const r = groupNode.rotation;
              const clampedY = obj.type === 'scoreboard' ? Math.max(0.5, p.y) : 0;
              groupNode.position.y = clampedY;
              onTransformCommit(
                obj.id,
                [Number(p.x.toFixed(2)), Number(clampedY.toFixed(2)), Number(p.z.toFixed(2))],
                Number(r.y.toFixed(3))
              );
            }
            invalidate();
          }}
        />
      )}
    </>
  );
};

/**
 * Composite Multi-Part FIBA-accurate Hoop Assembly supporting 4 Backboard styles & 3 Support styles.
 */
const HoopAssemblyMesh: React.FC<{
  obj: SceneObject;
  isSelected: boolean;
  archMode: boolean;
  techMode?: boolean;
}> = React.memo(({ obj, isSelected, archMode, techMode = false }) => {
  const rimH = obj.metadata?.rimHeightM ?? 3.05;
  const backboardX = obj.metadata?.extensionArmM ?? 2.05;
  const backboardType = obj.metadata?.backboardType ?? 'tempered_glass';
  const supportStyle = obj.metadata?.supportStyle ?? 'hydraulic_boom';
  const rimCenterX = backboardX + 0.375;
  const backboardCenterY = rimH - 0.15 + 0.525;

  const frameColor = techMode ? '#38BDF8' : archMode ? '#B8C2D0' : obj.color || '#202630';
  const accentColor = techMode ? '#F07827' : archMode ? '#F07827' : obj.secondaryColor || '#F07827';

  const netStrands = useMemo(() => {
    const strands: Array<[number, number, number][]> = [];
    const count = 12;
    const topR = 0.225;
    const botR = 0.135;
    const netLen = 0.42;
    for (let i = 0; i < count; i++) {
      const a0 = (i / count) * Math.PI * 2;
      const a1 = ((i + 0.5) / count) * Math.PI * 2;
      strands.push([
        [Math.cos(a0) * topR, 0, Math.sin(a0) * topR],
        [Math.cos(a1) * botR, -netLen, Math.sin(a1) * botR],
      ]);
      strands.push([
        [Math.cos(a0) * topR, 0, Math.sin(a0) * topR],
        [
          Math.cos(a1 - (Math.PI * 2) / count) * botR,
          -netLen,
          Math.sin(a1 - (Math.PI * 2) / count) * botR,
        ],
      ]);
    }
    return strands;
  }, []);

  const fanShapeGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.68, -0.44);
    shape.lineTo(0.68, -0.44);
    shape.lineTo(0.68, 0.05);
    shape.absarc(0, 0.05, 0.68, 0, Math.PI, false);
    shape.lineTo(-0.68, -0.44);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false });
    geo.rotateY(Math.PI / 2);
    geo.center();
    return geo;
  }, []);

  useEffect(() => () => fanShapeGeo.dispose(), [fanShapeGeo]);

  const gooseneckCurveGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.3, 0),
      new THREE.Vector3(0, rimH + 0.1, 0),
      new THREE.Vector3(backboardX * 0.4, rimH + 0.55, 0),
      new THREE.Vector3(backboardX - 0.06, backboardCenterY, 0),
    ]);
    return new THREE.TubeGeometry(curve, 24, 0.085, 14, false);
  }, [rimH, backboardX, backboardCenterY]);

  useEffect(() => () => gooseneckCurveGeo.dispose(), [gooseneckCurveGeo]);

  return (
    <group>
      {/* Support Structure Variants */}
      {supportStyle === 'hydraulic_boom' && (
        <>
          <mesh position={[0, 0.21, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.4, 0.42, 1.02]} />
            <meshStandardMaterial color={frameColor} roughness={0.45} metalness={0.72} />
          </mesh>
          <mesh position={[0.74, 0.58, 0]} castShadow>
            <boxGeometry args={[0.16, 1.12, 0.98]} />
            <meshStandardMaterial color={accentColor} roughness={0.82} metalness={0.04} />
          </mesh>
          <mesh position={[-0.08, 1.8, 0]} castShadow>
            <boxGeometry args={[0.24, 3.2, 0.24]} />
            <meshStandardMaterial color={frameColor} roughness={0.35} metalness={0.86} />
          </mesh>
          <mesh position={[0.42, 1.62, 0]} rotation={[0, 0, -0.46]} castShadow>
            <cylinderGeometry args={[0.055, 0.055, 2.0, 12]} />
            <meshStandardMaterial color="#8E9BAE" roughness={0.25} metalness={0.92} />
          </mesh>
          <mesh position={[backboardX / 2 - 0.06, backboardCenterY, 0]} castShadow>
            <boxGeometry args={[backboardX - 0.08, 0.16, 0.18]} />
            <meshStandardMaterial color={frameColor} roughness={0.38} metalness={0.84} />
          </mesh>
        </>
      )}

      {supportStyle === 'gooseneck_post' && (
        <>
          <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.32, 0.36, 0.36, 20]} />
            <meshStandardMaterial color="#4B5564" roughness={0.85} metalness={0.08} />
          </mesh>
          <mesh geometry={gooseneckCurveGeo} castShadow>
            <meshStandardMaterial color={frameColor} roughness={0.38} metalness={0.82} />
          </mesh>
          <mesh position={[0.08, 0.95, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.12, 1.6, 16]} />
            <meshStandardMaterial color={accentColor} roughness={0.82} metalness={0.05} />
          </mesh>
        </>
      )}

      {supportStyle === 'wall_mount' && (
        <>
          {/* Wall anchor plate */}
          <mesh position={[0, backboardCenterY, 0]} castShadow>
            <boxGeometry args={[0.08, 1.25, 1.4]} />
            <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.85} />
          </mesh>
          {/* Upper & lower folding struts */}
          {[-0.45, 0.45].map((zOff, idx) => (
            <group key={idx}>
              <mesh position={[backboardX / 2, backboardCenterY + 0.25, zOff]} castShadow>
                <boxGeometry args={[backboardX, 0.07, 0.07]} />
                <meshStandardMaterial color={frameColor} roughness={0.35} metalness={0.85} />
              </mesh>
              <mesh position={[backboardX / 2, backboardCenterY - 0.25, zOff]} castShadow>
                <boxGeometry args={[backboardX, 0.07, 0.07]} />
                <meshStandardMaterial color={frameColor} roughness={0.35} metalness={0.85} />
              </mesh>
            </group>
          ))}
        </>
      )}

      {/* Backboard Style Variants */}
      {backboardType === 'fan_outdoor' ? (
        <group position={[backboardX, backboardCenterY - 0.08, 0]}>
          <mesh geometry={fanShapeGeo} castShadow>
            <meshStandardMaterial color="#EAECEF" roughness={0.55} metalness={0.18} />
          </mesh>
          <group position={[0.02, -(backboardCenterY - 0.08) + rimH, 0]}>
            <mesh position={[0, 0.425, 0]}>
              <boxGeometry args={[0.005, 0.04, 0.59]} />
              <meshStandardMaterial color={accentColor} />
            </mesh>
            <mesh position={[0, 0.025, 0]}>
              <boxGeometry args={[0.005, 0.04, 0.59]} />
              <meshStandardMaterial color={accentColor} />
            </mesh>
            <mesh position={[0, 0.225, -0.275]}>
              <boxGeometry args={[0.005, 0.44, 0.04]} />
              <meshStandardMaterial color={accentColor} />
            </mesh>
            <mesh position={[0, 0.225, 0.275]}>
              <boxGeometry args={[0.005, 0.44, 0.04]} />
              <meshStandardMaterial color={accentColor} />
            </mesh>
          </group>
        </group>
      ) : (
        <>
          <mesh position={[backboardX - 0.025, backboardCenterY, 0]} castShadow>
            <boxGeometry args={[0.045, 1.09, 1.84]} />
            <meshStandardMaterial color="#C8D0DC" roughness={0.28} metalness={0.86} />
          </mesh>

          <mesh position={[backboardX, backboardCenterY, 0]}>
            <boxGeometry args={[0.02, 1.05, 1.8]} />
            {backboardType === 'solid_steel' ? (
              <meshStandardMaterial
                color={archMode ? '#DCE3EC' : '#EEF1F5'}
                roughness={0.5}
                metalness={0.18}
              />
            ) : (
              <meshPhysicalMaterial
                color={backboardType === 'frosted_acrylic' ? '#E4ECF5' : '#DCE8F5'}
                transparent
                opacity={backboardType === 'frosted_acrylic' ? 0.62 : 0.36}
                roughness={backboardType === 'frosted_acrylic' ? 0.35 : 0.07}
                metalness={0.05}
                clearcoat={1}
              />
            )}
          </mesh>

          {/* 5 cm shooter's rectangle */}
          <group position={[backboardX + 0.012, rimH, 0]}>
            {[
              { pos: [0, 0.425, 0] as const, args: [0.005, 0.05, 0.59] as const },
              { pos: [0, 0.025, 0] as const, args: [0.005, 0.05, 0.59] as const },
              { pos: [0, 0.225, -0.27] as const, args: [0.005, 0.45, 0.05] as const },
              { pos: [0, 0.225, 0.27] as const, args: [0.005, 0.45, 0.05] as const },
            ].map((b, i) => (
              <mesh key={i} position={[b.pos[0], b.pos[1], b.pos[2]]}>
                <boxGeometry args={[b.args[0], b.args[1], b.args[2]]} />
                <meshStandardMaterial
                  color={backboardType === 'solid_steel' ? accentColor : '#F2F4F7'}
                  roughness={0.4}
                />
              </mesh>
            ))}
          </group>

          {backboardType === 'tempered_glass' && (
            <mesh position={[backboardX, rimH - 0.16, 0]} castShadow>
              <boxGeometry args={[0.07, 0.06, 1.84]} />
              <meshStandardMaterial color={frameColor} roughness={0.8} metalness={0.05} />
            </mesh>
          )}
        </>
      )}

      {/* Rim mounting plate, breakaway rim (0.45 m inner dia) & braided nylon net */}
      <mesh position={[backboardX + 0.08, rimH - 0.03, 0]} castShadow>
        <boxGeometry args={[0.16, 0.12, 0.14]} />
        <meshStandardMaterial color={accentColor} roughness={0.35} metalness={0.7} />
      </mesh>
      <mesh position={[rimCenterX, rimH - 0.01, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.235, 0.011, 14, 36]} />
        <meshStandardMaterial color={accentColor} roughness={0.28} metalness={0.68} />
      </mesh>
      <group position={[rimCenterX, rimH - 0.02, 0]}>
        {netStrands.map((pts, idx) => (
          <Line key={idx} points={pts} color="#F2F4F7" lineWidth={1.1} transparent opacity={0.85} />
        ))}
      </group>

      <SelectionRing selected={isSelected} radius={1.05} />
    </group>
  );
});

const PlayerBenchMesh: React.FC<{ obj: SceneObject; isSelected: boolean; archMode: boolean }> =
  React.memo(({ obj, isSelected, archMode }) => (
    <group>
      {[-1.3, 0, 1.3].map((x, idx) => (
        <mesh key={idx} position={[x, 0.21, 0]} castShadow>
          <boxGeometry args={[0.07, 0.42, 0.45]} />
          <meshStandardMaterial color="#8E9BAE" roughness={0.35} metalness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.08, 0.52]} />
        <meshStandardMaterial
          color={archMode ? '#C2CBD8' : obj.color}
          roughness={0.68}
          metalness={0.1}
        />
      </mesh>
      <mesh position={[0, 0.72, -0.22]} castShadow>
        <boxGeometry args={[3.2, 0.42, 0.07]} />
        <meshStandardMaterial
          color={archMode ? '#98A4B5' : obj.secondaryColor || '#1686C9'}
          roughness={0.62}
          metalness={0.15}
        />
      </mesh>
      <SelectionRing selected={isSelected} radius={1.85} />
    </group>
  ));

const ScorerTableMesh: React.FC<{ obj: SceneObject; isSelected: boolean; archMode: boolean }> =
  React.memo(({ obj, isSelected, archMode }) => (
    <group>
      <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 0.76, 0.78]} />
        <meshStandardMaterial
          color={archMode ? '#BCC5D3' : obj.color}
          roughness={0.55}
          metalness={0.25}
        />
      </mesh>
      <mesh position={[0, 0.38, 0.4]} castShadow>
        <boxGeometry args={[3.2, 0.62, 0.05]} />
        <meshStandardMaterial
          color={archMode ? '#F07827' : obj.secondaryColor || '#F07827'}
          roughness={0.75}
          metalness={0.08}
        />
      </mesh>
      <mesh position={[0, 0.84, 0.12]} castShadow>
        <boxGeometry args={[0.75, 0.16, 0.25]} />
        <meshStandardMaterial color="#111318" roughness={0.35} metalness={0.6} />
      </mesh>
      <SelectionRing selected={isSelected} radius={1.95} />
    </group>
  ));

const LightingMastMesh: React.FC<{
  obj: SceneObject;
  isSelected: boolean;
  isNight: boolean;
  archMode: boolean;
}> = React.memo(({ obj, isSelected, isNight, archMode }) => (
  <group>
    <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.24, 0.28, 0.5, 16]} />
      <meshStandardMaterial color="#4A5464" roughness={0.88} metalness={0.05} />
    </mesh>
    <mesh position={[0, 3.5, 0]} castShadow>
      <cylinderGeometry args={[0.07, 0.13, 6.2, 16]} />
      <meshStandardMaterial
        color={archMode ? '#B4BECA' : obj.color}
        roughness={0.36}
        metalness={0.85}
      />
    </mesh>
    <mesh position={[0, 6.5, 0]} castShadow>
      <boxGeometry args={[1.25, 0.1, 0.12]} />
      <meshStandardMaterial
        color={archMode ? '#B4BECA' : obj.color}
        roughness={0.36}
        metalness={0.85}
      />
    </mesh>
    {[-0.42, 0.42].map((x, idx) => (
      <group key={idx} position={[x, 6.62, 0.14]} rotation={[0.42, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.38, 0.26, 0.12]} />
          <meshStandardMaterial color="#181C23" roughness={0.45} metalness={0.75} />
        </mesh>
        <mesh position={[0, 0, 0.065]}>
          <planeGeometry args={[0.32, 0.2]} />
          <meshStandardMaterial
            color="#FFFFFF"
            emissive="#FFF3D6"
            emissiveIntensity={isNight ? 3.2 : 1.1}
            roughness={0.2}
          />
        </mesh>
      </group>
    ))}
    {isNight && (
      <pointLight position={[0, 6.2, 0.8]} intensity={28} distance={28} decay={1.6} color="#FFF3DC" />
    )}
    <SelectionRing selected={isSelected} radius={0.75} />
  </group>
));

const ScoreboardMesh: React.FC<{ obj: SceneObject; isSelected: boolean; archMode: boolean }> =
  React.memo(({ obj, isSelected, archMode }) => (
    <group>
      <mesh castShadow>
        <boxGeometry args={[4.2, 1.5, 0.26]} />
        <meshStandardMaterial
          color={archMode ? '#AEB7C5' : obj.color}
          roughness={0.42}
          metalness={0.72}
        />
      </mesh>
      <mesh position={[0, 0, 0.135]}>
        <planeGeometry args={[3.9, 1.25]} />
        <meshStandardMaterial color="#0C0F14" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[-1.1, 0.1, 0.145]}>
        <planeGeometry args={[0.9, 0.55]} />
        <meshStandardMaterial color="#1686C9" emissive="#1686C9" emissiveIntensity={0.85} />
      </mesh>
      <mesh position={[1.1, 0.1, 0.145]}>
        <planeGeometry args={[0.9, 0.55]} />
        <meshStandardMaterial
          color={obj.secondaryColor || '#F07827'}
          emissive={obj.secondaryColor || '#F07827'}
          emissiveIntensity={0.85}
        />
      </mesh>
      {isSelected && (
        <mesh>
          <boxGeometry args={[4.35, 1.65, 0.35]} />
          <meshBasicMaterial color="#F07827" wireframe />
        </mesh>
      )}
    </group>
  ));

const PerimeterFenceMesh: React.FC<{
  obj: SceneObject;
  defaultSpan: number;
  isSelected: boolean;
}> = React.memo(({ obj, defaultSpan, isSelected }) => {
  const span = Math.max(4, obj.metadata?.fenceLengthM ?? defaultSpan);
  const posts = Math.max(3, Math.round(span / 3) + 1);
  const step = span / (posts - 1);

  return (
    <group>
      {Array.from({ length: posts }).map((_, i) => (
        <mesh key={i} position={[-span / 2 + i * step, 1.5, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 3.0, 10]} />
          <meshStandardMaterial color={obj.color} roughness={0.4} metalness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 2.98, 0]}>
        <boxGeometry args={[span, 0.06, 0.06]} />
        <meshStandardMaterial color={obj.color} roughness={0.4} metalness={0.8} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <planeGeometry args={[span, 2.9]} />
        <meshStandardMaterial
          color="#5A6678"
          wireframe
          transparent
          opacity={0.45}
          side={THREE.DoubleSide}
        />
      </mesh>
      <SelectionRing selected={isSelected} radius={1.6} />
    </group>
  );
});

const BleachersMesh: React.FC<{ obj: SceneObject; isSelected: boolean; archMode: boolean }> =
  React.memo(({ obj, isSelected, archMode }) => (
    <group>
      {/* 3-tier aluminum spectator bleachers */}
      {[0, 1, 2].map((tier) => (
        <group key={tier} position={[0, 0.36 + tier * 0.38, -tier * 0.62]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[6.4, 0.08, 0.56]} />
            <meshStandardMaterial
              color={archMode ? '#C2CBD8' : obj.secondaryColor || '#1686C9'}
              roughness={0.42}
              metalness={0.45}
            />
          </mesh>
          <mesh position={[0, -0.18 - tier * 0.19, 0]} castShadow>
            <boxGeometry args={[6.2, 0.36 + tier * 0.38, 0.1]} />
            <meshStandardMaterial
              color={archMode ? '#9BA5B4' : obj.color}
              roughness={0.5}
              metalness={0.75}
            />
          </mesh>
        </group>
      ))}
      <SelectionRing selected={isSelected} radius={2.2} />
    </group>
  ));

const BallRackMesh: React.FC<{ obj: SceneObject; isSelected: boolean; archMode: boolean }> =
  React.memo(({ obj, isSelected, archMode }) => (
    <group>
      {/* Tubular steel cart frame */}
      {[-0.52, 0.52].map((x, idx) => (
        <mesh key={idx} position={[x, 0.48, 0]} castShadow>
          <boxGeometry args={[0.04, 0.96, 0.42]} />
          <meshStandardMaterial color={obj.color} roughness={0.35} metalness={0.85} />
        </mesh>
      ))}
      {[0.25, 0.65].map((y, idx) => (
        <mesh key={idx} position={[0, y, 0]} castShadow>
          <boxGeometry args={[1.08, 0.04, 0.36]} />
          <meshStandardMaterial color={obj.color} roughness={0.35} metalness={0.85} />
        </mesh>
      ))}
      {/* 6 basketballs */}
      {[-0.32, 0, 0.32].map((x, xi) =>
        [0.4, 0.8].map((y, yi) => (
          <mesh key={`${xi}-${yi}`} position={[x, y, 0]} castShadow>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial
              color={archMode ? '#F07827' : obj.secondaryColor || '#D96B27'}
              roughness={0.76}
              metalness={0.05}
            />
          </mesh>
        ))
      )}
      <SelectionRing selected={isSelected} radius={0.75} />
    </group>
  ));

const SurroundingsGroup: React.FC<{
  preset: SurroundingsPreset;
  totalL: number;
  totalW: number;
  archMode: boolean;
}> = React.memo(({ preset, totalL, totalW, archMode }) => {
  if (preset === 'minimal') return null;

  if (preset === 'arena') {
    const wallOffsetZ = totalW / 2 + 5.5;
    const wallOffsetX = totalL / 2 + 5.5;
    const wallColor = archMode ? '#272E3A' : '#181E27';
    return (
      <group>
        {/* Back & end architectural arena walls */}
        <mesh position={[0, 4.5, -wallOffsetZ]} receiveShadow>
          <boxGeometry args={[totalL + 11, 9, 0.35]} />
          <meshStandardMaterial color={wallColor} roughness={0.85} metalness={0.12} />
        </mesh>
        <mesh position={[-wallOffsetX, 4.5, 0]} receiveShadow>
          <boxGeometry args={[0.35, 9, totalW + 11]} />
          <meshStandardMaterial color={wallColor} roughness={0.85} metalness={0.12} />
        </mesh>
        {/* Structural steel bay columns */}
        {[-totalL / 2, 0, totalL / 2].map((x, idx) => (
          <mesh key={idx} position={[x, 4.5, -wallOffsetZ + 0.28]} castShadow>
            <boxGeometry args={[0.45, 9, 0.45]} />
            <meshStandardMaterial color="#2D3646" roughness={0.4} metalness={0.8} />
          </mesh>
        ))}
        {/* Overhead steel roof trusses */}
        {[-totalL * 0.35, 0, totalL * 0.35].map((x, idx) => (
          <mesh key={idx} position={[x, 9.2, 0]}>
            <boxGeometry args={[0.32, 0.55, totalW + 11]} />
            <meshStandardMaterial color="#252C38" roughness={0.45} metalness={0.75} />
          </mesh>
        ))}
      </group>
    );
  }

  if (preset === 'park') {
    const trees = [
      [-totalL / 2 - 4.2, -totalW / 2 - 3.5],
      [totalL / 2 + 4.2, -totalW / 2 - 3.5],
      [-totalL / 2 - 5.0, totalW / 2 + 3.2],
      [totalL / 2 + 5.0, totalW / 2 + 3.2],
      [0, -totalW / 2 - 5.2],
    ];
    return (
      <group>
        {/* Concrete park plaza apron */}
        <mesh position={[0, -0.21, 0]} receiveShadow>
          <boxGeometry args={[totalL + 12, 0.04, totalW + 12]} />
          <meshStandardMaterial
            color={archMode ? '#303846' : '#252D38'}
            roughness={0.92}
            metalness={0.04}
          />
        </mesh>
        {/* Stylized architectural park trees */}
        {trees.map(([x, z], idx) => (
          <group key={idx} position={[x, -0.19, z]}>
            <mesh position={[0, 1.2, 0]} castShadow>
              <cylinderGeometry args={[0.14, 0.2, 2.4, 10]} />
              <meshStandardMaterial color="#594333" roughness={0.9} />
            </mesh>
            <mesh position={[0, 3.2, 0]} castShadow>
              <dodecahedronGeometry args={[1.45, 1]} />
              <meshStandardMaterial
                color={archMode ? '#748296' : '#2E5E44'}
                roughness={0.86}
                metalness={0.02}
              />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  // Rooftop deck
  return (
    <group>
      <mesh position={[0, -0.35, 0]} receiveShadow>
        <boxGeometry args={[totalL + 7, 0.3, totalW + 7]} />
        <meshStandardMaterial color="#252C38" roughness={0.88} metalness={0.08} />
      </mesh>
      {/* Perimeter rooftop parapet wall */}
      <mesh position={[0, 0.45, -(totalW / 2 + 3.3)]} castShadow>
        <boxGeometry args={[totalL + 7, 1.3, 0.3]} />
        <meshStandardMaterial color="#2F3847" roughness={0.85} />
      </mesh>
      <mesh position={[-(totalL / 2 + 3.3), 0.45, 0]} castShadow>
        <boxGeometry args={[0.3, 1.3, totalW + 7]} />
        <meshStandardMaterial color="#2F3847" roughness={0.85} />
      </mesh>
    </group>
  );
});

function getLightingRig(mode: LightingMode, isIndoor: boolean, renderMode: RenderMode) {
  if (renderMode === 'technical') {
    return {
      bg: '#08101C',
      hemiSky: '#D8ECFF',
      hemiGround: '#102036',
      hemiIntensity: 1.05,
      sunPos: [18, 32, 18] as [number, number, number],
      sunColor: '#FFFFFF',
      sunIntensity: 1.1,
    };
  }
  if (renderMode === 'architectural') {
    return {
      bg: '#161A22',
      hemiSky: '#DCE6F4',
      hemiGround: '#242B36',
      hemiIntensity: 0.9,
      sunPos: [20, 30, 18] as [number, number, number],
      sunColor: '#FFFFFF',
      sunIntensity: 1.35,
    };
  }
  if (mode === 'sunset') {
    return {
      bg: '#1A1724',
      hemiSky: '#8798C8',
      hemiGround: '#2C2122',
      hemiIntensity: 0.62,
      sunPos: [-28, 8.5, 14] as [number, number, number],
      sunColor: '#FF9E5E',
      sunIntensity: 2.15,
    };
  }
  if (mode === 'night') {
    return {
      bg: '#080B12',
      hemiSky: '#3A4D70',
      hemiGround: '#10141C',
      hemiIntensity: 0.42,
      sunPos: [14, 26, -14] as [number, number, number],
      sunColor: '#B8D4FF',
      sunIntensity: 0.55,
    };
  }
  return {
    bg: isIndoor ? '#0E1117' : '#141B26',
    hemiSky: isIndoor ? '#DCE7F5' : '#9EC6EC',
    hemiGround: '#1E242E',
    hemiIntensity: isIndoor ? 0.68 : 0.82,
    sunPos: [18, 28, 16] as [number, number, number],
    sunColor: isIndoor ? '#FFF6EA' : '#FFF9EB',
    sunIntensity: isIndoor ? 1.45 : 1.78,
  };
}

interface CourtContentProps {
  project: CourtProject;
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
  toolMode: ToolMode;
  onTransformCommit?: (id: string, pos: [number, number, number], rotY: number) => void;
  onCameraSettled?: (settings: Partial<CameraSettings>) => void;
  showGrid: boolean;
  showDimensions: boolean;
  cameraPreset: CameraPreset;
  projection: CameraProjection;
  presetVersion: number;
  cameraSyncKey?: number;
  isSoftwareGl: boolean;
}

const CourtContent: React.FC<CourtContentProps> = ({
  project,
  selectedObjectId,
  onSelectObject,
  toolMode,
  onTransformCommit,
  onCameraSettled,
  showGrid,
  showDimensions,
  cameraPreset,
  projection,
  presetVersion,
  cameraSyncKey = 0,
  isSoftwareGl,
}) => {
  const { gl, invalidate } = useThree();
  const maxAnisotropy = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);
  const [isTransforming, setIsTransforming] = useState(false);

  useEffect(() => {
    invalidate();
  }, [project, selectedObjectId, toolMode, showGrid, showDimensions, invalidate]);

  const spec = COURT_STANDARDS[project.standard];
  const { lengthM, widthM, apronM, isHalfCourt, orientationDeg, showSafetyZone } =
    project.dimensions;
  const totalL = lengthM + apronM * 2;
  const totalW = widthM + apronM * 2;
  const playingAreaSqM = lengthM * widthM;
  const orientationRad = ((orientationDeg ?? 0) * Math.PI) / 180;

  const envSettings = project.environmentSettings;
  const renderMode = envSettings.renderMode;
  const archMode = renderMode === 'architectural';
  const techMode = renderMode === 'technical';
  const schematicMode = archMode || techMode;
  const isNight = envSettings.lightingMode === 'night';
  const shadowsOn = envSettings.shadowsEnabled && !isSoftwareGl && !techMode;

  const rig = getLightingRig(envSettings.lightingMode, project.environment === 'indoor', renderMode);

  const surfaceTexture = useMemo(
    () =>
      createSurfaceTexture(
        project.materials.surfaceType,
        project.materials.surfaceColor,
        maxAnisotropy
      ),
    [project.materials.surfaceType, project.materials.surfaceColor, maxAnisotropy]
  );

  useEffect(() => () => surfaceTexture.dispose(), [surfaceTexture]);

  const boundaryGeo = useMemo(
    () => createBoundaryLinesGeometry(lengthM, widthM, spec.lineWidthM),
    [lengthM, widthM, spec.lineWidthM]
  );
  const centreLinesGeo = useMemo(
    () => createCentreLinesGeometry(widthM, spec.centerCircleRadiusM, spec.lineWidthM),
    [widthM, spec.centerCircleRadiusM, spec.lineWidthM]
  );
  const centreFillGeo = useMemo(
    () => createCentreFillGeometry(spec.centerCircleRadiusM, spec.lineWidthM),
    [spec.centerCircleRadiusM, spec.lineWidthM]
  );
  const freeThrowGeos = useMemo(
    () =>
      createFreeThrowGeometries({
        lengthM,
        widthM,
        keyLengthM: spec.keyLengthM,
        keyWidthM: spec.keyWidthM,
        freeThrowRadiusM: spec.freeThrowRadiusM,
        restrictedRadiusM: 1.25,
        basketOffsetM: spec.basketCenterFromBaselineM,
        backboardOffsetM: spec.backboardFromBaselineM,
        lineWidthM: spec.lineWidthM,
        isHalfCourt,
      }),
    [lengthM, widthM, spec, isHalfCourt]
  );
  const threePointGeo = useMemo(
    () =>
      createThreePointLinesGeometry({
        lengthM,
        widthM,
        threePointRadiusM: spec.threePointRadiusM,
        cornerInsetM: spec.threePointCornerInsetM,
        basketOffsetM: spec.basketCenterFromBaselineM,
        lineWidthM: spec.lineWidthM,
        isHalfCourt,
      }),
    [lengthM, widthM, spec, isHalfCourt]
  );

  useEffect(() => () => boundaryGeo.dispose(), [boundaryGeo]);
  useEffect(() => () => centreLinesGeo.dispose(), [centreLinesGeo]);
  useEffect(() => () => centreFillGeo.dispose(), [centreFillGeo]);
  useEffect(() => {
    return () => {
      freeThrowGeos.paintGeometry.dispose();
      freeThrowGeos.linesGeometry.dispose();
    };
  }, [freeThrowGeos]);
  useEffect(() => () => threePointGeo.dispose(), [threePointGeo]);

  const slabObj = project.objects.find((o) => o.type === 'court_slab');
  const surfaceObj = project.objects.find((o) => o.type === 'playing_surface');
  const boundaryObj = project.objects.find((o) => o.type === 'boundary_lines');
  const centreObj = project.objects.find((o) => o.type === 'centre_markings');
  const freeThrowObj = project.objects.find((o) => o.type === 'free_throw_areas');
  const threePtObj = project.objects.find((o) => o.type === 'three_point_lines');

  const propObjects = project.objects.filter(
    (o) =>
      o.type !== 'court_slab' &&
      o.type !== 'playing_surface' &&
      o.type !== 'boundary_lines' &&
      o.type !== 'centre_markings' &&
      o.type !== 'free_throw_areas' &&
      o.type !== 'three_point_lines' &&
      o.type !== 'court_markings'
  );

  const isWood =
    !archMode &&
    (project.materials.surfaceType === 'hardwood_maple' ||
      project.materials.surfaceType === 'hardwood_dark');

  const isSelectedCourtFloor =
    selectedObjectId &&
    [
      slabObj?.id,
      surfaceObj?.id,
      boundaryObj?.id,
      centreObj?.id,
      freeThrowObj?.id,
      threePtObj?.id,
    ].includes(selectedObjectId);

  return (
    <>
      <color attach="background" args={[rig.bg]} />
      <fog attach="fog" args={[rig.bg, 45, 130]} />
      <StudioEnvironment />

      <hemisphereLight args={[rig.hemiSky, rig.hemiGround, rig.hemiIntensity]} />
      <directionalLight
        position={rig.sunPos}
        intensity={rig.sunIntensity}
        color={rig.sunColor}
        castShadow={shadowsOn}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-camera-near={2}
        shadow-camera-far={85}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-18, 14, -14]} intensity={0.44} color="#9CC4F2" />

      {/* Night arena overhead fill pools */}
      {isNight && (
        <>
          <pointLight position={[-8, 9, 0]} intensity={52} distance={34} decay={1.5} color="#FFF4E0" />
          <pointLight position={[8, 9, 0]} intensity={52} distance={34} decay={1.5} color="#FFF4E0" />
        </>
      )}

      {/* Ground site plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.201, 0]}
        receiveShadow={shadowsOn}
        onClick={(e) => {
          e.stopPropagation();
          onSelectObject(null);
        }}
      >
        <planeGeometry args={[220, 220]} />
        <meshStandardMaterial
          color={
            techMode
              ? '#091322'
              : archMode
              ? '#141820'
              : project.environment === 'indoor'
              ? '#12151C'
              : '#171E28'
          }
          roughness={0.95}
          metalness={0.05}
        />
      </mesh>

      {(showGrid || techMode) && (
        <Grid
          position={[0, -0.195, 0]}
          args={[110, 110]}
          cellSize={1}
          cellThickness={0.55}
          cellColor={techMode ? '#18355E' : '#252D3A'}
          sectionSize={5}
          sectionThickness={1}
          sectionColor={techMode ? '#295794' : '#334054'}
          fadeDistance={70}
          fadeStrength={1.2}
        />
      )}

      {/* World North Orientation Marker */}
      <group position={[0, -0.16, -(totalW / 2 + 3.2)]}>
        <Line
          points={[
            [0, 0, 0.7],
            [0, 0, -0.7],
            [-0.25, 0, -0.3],
            [0, 0, -0.7],
            [0.25, 0, -0.3],
          ]}
          color="#F07827"
          lineWidth={1.5}
        />
        <Text
          position={[0.55, 0.02, -0.45]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.5}
          color="#9AA4B2"
        >
          N
        </Text>
      </group>

      {/* Rotatable Court + Surroundings Orientation Group */}
      <group rotation={[0, orientationRad, 0]}>
        <SurroundingsGroup
          preset={envSettings.surroundings}
          totalL={totalL}
          totalW={totalW}
          archMode={archMode}
        />

        {/* 1. Court Slab (Safety Clearance Footprint) */}
        {slabObj && slabObj.visible && (
          <group>
            <mesh
              position={[0, -0.1, 0]}
              receiveShadow={shadowsOn}
              castShadow={shadowsOn}
              onClick={(e) => {
                e.stopPropagation();
                onSelectObject(slabObj.id);
              }}
            >
              <boxGeometry args={[totalL, 0.2, totalW]} />
              <meshStandardMaterial
                color={
                  techMode
                    ? '#0F1C32'
                    : archMode
                    ? '#2B323E'
                    : project.materials.apronColor
                }
                roughness={0.8}
                metalness={0.06}
              />
            </mesh>
            <Line
              points={[
                [-totalL / 2, 0.004, -totalW / 2],
                [totalL / 2, 0.004, -totalW / 2],
                [totalL / 2, 0.004, totalW / 2],
                [-totalL / 2, 0.004, totalW / 2],
                [-totalL / 2, 0.004, -totalW / 2],
              ]}
              color={techMode ? '#38BDF8' : showSafetyZone ? '#1686C9' : '#3D4A5E'}
              lineWidth={techMode || showSafetyZone ? 1.6 : 1}
            />
          </group>
        )}

        {/* 2. Playing Surface */}
        {surfaceObj && surfaceObj.visible && (
          <mesh
            position={[0, 0.002, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow={shadowsOn}
            onClick={(e) => {
              e.stopPropagation();
              onSelectObject(surfaceObj.id);
            }}
          >
            <planeGeometry args={[lengthM + 0.1, widthM + 0.1]} />
            {schematicMode ? (
              <meshStandardMaterial
                color={techMode ? '#132746' : '#D6DCE5'}
                roughness={0.9}
                metalness={0.02}
              />
            ) : (
              <meshPhysicalMaterial
                map={surfaceTexture}
                roughness={isWood ? 0.3 : 0.72}
                metalness={0.04}
                clearcoat={isWood ? 0.65 : 0}
                clearcoatRoughness={0.18}
              />
            )}
          </mesh>
        )}

        {/* 3. Free-Throw Areas */}
        {freeThrowObj && freeThrowObj.visible && (
          <group
            onClick={(e) => {
              e.stopPropagation();
              onSelectObject(freeThrowObj.id);
            }}
          >
            <mesh geometry={freeThrowGeos.paintGeometry} position={[0, 0.004, 0]} receiveShadow={shadowsOn}>
              <meshStandardMaterial
                color={
                  techMode
                    ? '#1C3B69'
                    : archMode
                    ? '#9BA7B8'
                    : project.materials.paintColor
                }
                roughness={isWood ? 0.36 : 0.68}
                polygonOffset
                polygonOffsetFactor={-1}
                polygonOffsetUnits={-1}
              />
            </mesh>
            <mesh geometry={freeThrowGeos.linesGeometry} position={[0, 0.006, 0]} receiveShadow={shadowsOn}>
              <meshStandardMaterial
                color={
                  techMode
                    ? '#E6F2FF'
                    : archMode
                    ? '#141820'
                    : project.materials.lineColor
                }
                roughness={0.45}
                polygonOffset
                polygonOffsetFactor={-2}
                polygonOffsetUnits={-2}
              />
            </mesh>
          </group>
        )}

        {/* 4. Centre Line & Circle */}
        {centreObj && centreObj.visible && !isHalfCourt && (
          <group
            onClick={(e) => {
              e.stopPropagation();
              onSelectObject(centreObj.id);
            }}
          >
            <mesh geometry={centreFillGeo} position={[0, 0.004, 0]} receiveShadow={shadowsOn}>
              <meshStandardMaterial
                color={
                  techMode
                    ? '#1C3B69'
                    : archMode
                    ? '#9BA7B8'
                    : project.materials.paintColor
                }
                roughness={isWood ? 0.36 : 0.68}
                polygonOffset
                polygonOffsetFactor={-1}
                polygonOffsetUnits={-1}
              />
            </mesh>
            <mesh geometry={centreLinesGeo} position={[0, 0.006, 0]} receiveShadow={shadowsOn}>
              <meshStandardMaterial
                color={
                  techMode
                    ? '#E6F2FF'
                    : archMode
                    ? '#141820'
                    : project.materials.lineColor
                }
                roughness={0.45}
                polygonOffset
                polygonOffsetFactor={-2}
                polygonOffsetUnits={-2}
              />
            </mesh>
          </group>
        )}

        {/* 5. Boundary Lines */}
        {boundaryObj && boundaryObj.visible && (
          <mesh
            geometry={boundaryGeo}
            position={[0, 0.0065, 0]}
            receiveShadow={shadowsOn}
            onClick={(e) => {
              e.stopPropagation();
              onSelectObject(boundaryObj.id);
            }}
          >
            <meshStandardMaterial
              color={
                techMode
                  ? '#E6F2FF'
                  : archMode
                  ? '#141820'
                  : project.materials.lineColor
              }
              roughness={0.45}
              polygonOffset
              polygonOffsetFactor={-2}
              polygonOffsetUnits={-2}
            />
          </mesh>
        )}

        {/* 6. Three-Point Lines */}
        {threePtObj && threePtObj.visible && (
          <mesh
            geometry={threePointGeo}
            position={[0, 0.0065, 0]}
            receiveShadow={shadowsOn}
            onClick={(e) => {
              e.stopPropagation();
              onSelectObject(threePtObj.id);
            }}
          >
            <meshStandardMaterial
              color={
                techMode
                  ? '#E6F2FF'
                  : archMode
                  ? '#141820'
                  : project.materials.lineColor
              }
              roughness={0.45}
              polygonOffset
              polygonOffsetFactor={-2}
              polygonOffsetUnits={-2}
            />
          </mesh>
        )}

        {isSelectedCourtFloor && (
          <Line
            points={[
              [-lengthM / 2, 0.03, -widthM / 2],
              [lengthM / 2, 0.03, -widthM / 2],
              [lengthM / 2, 0.03, widthM / 2],
              [-lengthM / 2, 0.03, widthM / 2],
              [-lengthM / 2, 0.03, -widthM / 2],
            ]}
            color="#F07827"
            lineWidth={2}
          />
        )}

        {/* 7–11. Interactive Moveable & Rotatable Equipment Assemblies */}
        {propObjects.map((obj) => {
          const isSelected = obj.id === selectedObjectId;
          return (
            <SelectableObjectGroup
              key={obj.id}
              obj={obj}
              isSelected={isSelected}
              toolMode={toolMode}
              onSelect={onSelectObject}
              onDraggingChange={setIsTransforming}
              onTransformCommit={onTransformCommit}
            >
              {obj.type === 'hoop_assembly' && (
                <HoopAssemblyMesh
                  obj={obj}
                  isSelected={isSelected}
                  archMode={archMode}
                  techMode={techMode}
                />
              )}
              {obj.type === 'player_bench' && (
                <PlayerBenchMesh obj={obj} isSelected={isSelected} archMode={archMode || techMode} />
              )}
              {obj.type === 'scorer_table' && (
                <ScorerTableMesh obj={obj} isSelected={isSelected} archMode={archMode || techMode} />
              )}
              {obj.type === 'lighting_mast' && (
                <LightingMastMesh
                  obj={obj}
                  isSelected={isSelected}
                  isNight={isNight}
                  archMode={archMode || techMode}
                />
              )}
              {obj.type === 'scoreboard' && (
                <ScoreboardMesh obj={obj} isSelected={isSelected} archMode={archMode} />
              )}
              {obj.type === 'perimeter_fence' && (
                <PerimeterFenceMesh
                  obj={obj}
                  defaultSpan={totalL * 0.72}
                  isSelected={isSelected}
                />
              )}
              {obj.type === 'bleachers' && (
                <BleachersMesh obj={obj} isSelected={isSelected} archMode={archMode} />
              )}
              {obj.type === 'ball_rack' && (
                <BallRackMesh obj={obj} isSelected={isSelected} archMode={archMode} />
              )}
            </SelectableObjectGroup>
          );
        })}

        {/* Precision 3D Dimension Callouts */}
        {(showDimensions || techMode) && (
          <group position={[0, 0.04, 0]}>
            <Line
              points={[
                [-lengthM / 2, 0, totalW / 2 + 0.85],
                [lengthM / 2, 0, totalW / 2 + 0.85],
              ]}
              color="#1686C9"
              lineWidth={1.5}
            />
            <Line
              points={[
                [-lengthM / 2, 0, widthM / 2],
                [-lengthM / 2, 0, totalW / 2 + 1.1],
              ]}
              color="#1686C9"
              lineWidth={1}
            />
            <Line
              points={[
                [lengthM / 2, 0, widthM / 2],
                [lengthM / 2, 0, totalW / 2 + 1.1],
              ]}
              color="#1686C9"
              lineWidth={1}
            />
            <Text
              position={[0, 0.05, totalW / 2 + 1.55]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.58}
              color="#F2F4F7"
              anchorX="center"
              anchorY="middle"
            >
              {`PLAYING COURT: ${formatLength(lengthM, project.unit)} × ${formatLength(
                widthM,
                project.unit
              )} (${formatArea(playingAreaSqM, project.unit)})`}
            </Text>

            <Line
              points={[
                [totalL / 2 + 0.85, 0, -widthM / 2],
                [totalL / 2 + 0.85, 0, widthM / 2],
              ]}
              color="#F07827"
              lineWidth={1.5}
            />
            <Line
              points={[
                [lengthM / 2, 0, -widthM / 2],
                [totalL / 2 + 1.1, 0, -widthM / 2],
              ]}
              color="#F07827"
              lineWidth={1}
            />
            <Line
              points={[
                [lengthM / 2, 0, widthM / 2],
                [totalL / 2 + 1.1, 0, widthM / 2],
              ]}
              color="#F07827"
              lineWidth={1}
            />
            <Text
              position={[totalL / 2 + 1.6, 0.05, 0]}
              rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
              fontSize={0.56}
              color="#F2F4F7"
              anchorX="center"
              anchorY="middle"
            >
              {`WIDTH: ${formatLength(widthM, project.unit)} · CLEARANCE: +${formatLength(
                apronM,
                project.unit
              )}`}
            </Text>
          </group>
        )}
      </group>

      <CameraRig
        key={`${project.id}-${cameraSyncKey}`}
        preset={cameraPreset}
        projection={projection}
        presetVersion={presetVersion}
        initialCamera={project.cameraSettings}
        courtLength={lengthM}
        courtWidth={widthM}
        isSoftwareGl={isSoftwareGl}
        orbitEnabled={!isTransforming}
        onCameraSettled={onCameraSettled}
      />
    </>
  );
};

export interface CourtViewportProps {
  project: CourtProject;
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
  toolMode?: ToolMode;
  onTransformCommit?: (id: string, pos: [number, number, number], rotY: number) => void;
  onCameraSettled?: (settings: Partial<CameraSettings>) => void;
  showGrid?: boolean;
  showDimensions?: boolean;
  cameraPreset?: CameraPreset;
  projection?: CameraProjection;
  presetVersion?: number;
  cameraSyncKey?: number;
  className?: string;
}

export const CourtViewport: React.FC<CourtViewportProps> = ({
  project,
  selectedObjectId,
  onSelectObject,
  toolMode = 'select',
  onTransformCommit,
  onCameraSettled,
  showGrid = true,
  showDimensions = true,
  cameraPreset = 'perspective',
  projection = 'perspective',
  presetVersion = 0,
  cameraSyncKey = 0,
  className = '',
}) => {
  const [contextLost, setContextLost] = useState(false);
  const isSoftwareGl = useMemo(() => detectSoftwareGl(), []);
  const shadowsOn = project.environmentSettings.shadowsEnabled && !isSoftwareGl;

  if (contextLost) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#111318] text-[#F2F4F7] p-6 ${className}`}
      >
        <p className="text-sm font-medium mb-2">3D WebGL context was interrupted</p>
        <button
          onClick={() => setContextLost(false)}
          className="px-4 py-2 text-xs font-medium bg-[#F07827] text-white rounded-md hover:bg-[#d9671c] transition-colors cursor-pointer"
        >
          Restore 3D Viewport
        </button>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full bg-[#111318] ${className}`}>
      <Canvas
        frameloop="demand"
        shadows={shadowsOn}
        dpr={isSoftwareGl ? 1 : [1, 2]}
        gl={{
          antialias: !isSoftwareGl,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.08,
        }}
        onCreated={({ gl, invalidate }) => {
          invalidate();
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            setContextLost(true);
          });
          gl.domElement.addEventListener('webglcontextrestored', () => {
            setContextLost(false);
            invalidate();
          });
        }}
      >
        <CourtContent
          project={project}
          selectedObjectId={selectedObjectId}
          onSelectObject={onSelectObject}
          toolMode={toolMode}
          onTransformCommit={onTransformCommit}
          onCameraSettled={onCameraSettled}
          showGrid={showGrid}
          showDimensions={showDimensions}
          cameraPreset={cameraPreset}
          projection={projection}
          presetVersion={presetVersion}
          cameraSyncKey={cameraSyncKey}
          isSoftwareGl={isSoftwareGl}
        />
      </Canvas>
    </div>
  );
};
