import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Grid,
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
} from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import {
  StudioCameraPreset,
  StudioCameraState,
  StudioLightingMode,
  StudioProjection,
  StudioRenderMode,
} from './types';

const _desiredPos = new THREE.Vector3();
const _desiredTarget = new THREE.Vector3();

export const detectSoftwareGl = (): boolean => {
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

export const StudioEnvironment: React.FC = () => {
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

export interface StudioCameraRigProps {
  preset: StudioCameraPreset;
  projection: StudioProjection;
  presetVersion: number;
  initialCamera?: Partial<StudioCameraState>;
  sceneLength: number;
  sceneWidth: number;
  isSoftwareGl: boolean;
  orbitEnabled: boolean;
  minDistance?: number;
  onCameraSettled?: (settings: Partial<StudioCameraState>) => void;
}

export const StudioCameraRig: React.FC<StudioCameraRigProps> = ({
  preset,
  projection,
  presetVersion,
  initialCamera,
  sceneLength,
  sceneWidth,
  isSoftwareGl,
  orbitEnabled,
  minDistance = 1.5,
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
    if (!initializedRef.current && initialCamera?.position && initialCamera?.target && presetVersion === 0) {
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

    const diag = Math.hypot(sceneLength, sceneWidth);
    const span = Math.max(sceneLength, sceneWidth, diag * 0.86);
    if (preset === 'top') {
      _desiredPos.set(0, span * 1.25, 0.01);
      _desiredTarget.set(0, 0, 0);
    } else if (preset === 'front') {
      _desiredPos.set(
        -(sceneLength / 2 + Math.max(4, sceneWidth * 0.65)),
        Math.max(1.8, sceneWidth * 0.18),
        0
      );
      _desiredTarget.set(0, Math.min(1.5, span * 0.08), 0);
    } else if (preset === 'side') {
      _desiredPos.set(
        0,
        Math.max(2.0, span * 0.16),
        sceneWidth / 2 + Math.max(5, sceneLength * 0.5)
      );
      _desiredTarget.set(0, Math.min(1.4, span * 0.08), 0);
    } else {
      _desiredPos.set(span * 0.66, span * 0.44, span * 0.72);
      _desiredTarget.set(0, Math.min(0.6, span * 0.04), 0);
    }

    const fitZoom = Math.max(2.5, Math.min(size.width, size.height) / (Math.max(1, span) * 1.15));
    desiredZoom.current = fitZoom;
    transitionActive.current = true;
    invalidate();
  }, [preset, presetVersion, sceneLength, sceneWidth, size.width, size.height, invalidate]);

  useEffect(() => {
    const fromCam = projection === 'orthographic' ? perspRef.current : orthoRef.current;
    const toCam = projection === 'orthographic' ? orthoRef.current : perspRef.current;
    if (fromCam && toCam) {
      toCam.position.copy(fromCam.position);
      toCam.quaternion.copy(fromCam.quaternion);
    }
    if (projection === 'orthographic' && orthoRef.current) {
      const span = Math.max(1, sceneLength, sceneWidth);
      orthoRef.current.zoom = Math.max(2.5, Math.min(size.width, size.height) / (span * 1.2));
      orthoRef.current.updateProjectionMatrix();
    }
    controlsRef.current?.update();
    invalidate();
  }, [projection, sceneLength, sceneWidth, size.width, size.height, invalidate]);

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

  const diag = Math.hypot(sceneLength, sceneWidth);
  const camFar = Math.max(360, diag * 4);
  const maxDist = Math.max(35, diag * 2.4);

  return (
    <>
      <PerspectiveCamera
        ref={perspRef}
        makeDefault={projection === 'perspective'}
        fov={44}
        near={0.15}
        far={camFar}
        position={initialCamera?.position ?? [19, 13, 21]}
      />
      <OrthographicCamera
        ref={orthoRef}
        makeDefault={projection === 'orthographic'}
        near={-Math.max(160, diag * 1.5)}
        far={camFar}
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
        minDistance={minDistance}
        maxDistance={maxDist}
        minZoom={2}
        maxZoom={220}
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

export interface StudioCanvasProps {
  shadows: boolean;
  isSoftwareGl?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const StudioCanvas: React.FC<StudioCanvasProps> = ({
  shadows,
  isSoftwareGl: externalSoftwareGl,
  className = '',
  children,
}) => {
  const [contextLost, setContextLost] = useState(false);
  const detectedSoftwareGl = useMemo(() => detectSoftwareGl(), []);
  const isSoftwareGl = externalSoftwareGl ?? detectedSoftwareGl;
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  if (contextLost) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#111318] text-[#F2F4F7] p-6 ${className}`}
      >
        <p className="text-sm font-medium mb-2">3D WebGL context was interrupted</p>
        <button
          type="button"
          onClick={() => setContextLost(false)}
          className="px-4 py-2 text-xs font-medium bg-[#F07827] text-[#111318] rounded-md hover:bg-[#ff8a3d] transition-colors cursor-pointer"
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
        shadows={shadows && !isSoftwareGl}
        dpr={isSoftwareGl ? 1 : [1, 2]}
        gl={{
          antialias: !isSoftwareGl,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.08,
        }}
        onCreated={({ gl, invalidate }) => {
          cleanupRef.current?.();
          invalidate();
          const canvasEl = gl.domElement;
          const onLost = (e: Event) => {
            e.preventDefault();
            setContextLost(true);
          };
          const onRestored = () => {
            setContextLost(false);
            invalidate();
          };
          canvasEl.addEventListener('webglcontextlost', onLost);
          canvasEl.addEventListener('webglcontextrestored', onRestored);
          cleanupRef.current = () => {
            canvasEl.removeEventListener('webglcontextlost', onLost);
            canvasEl.removeEventListener('webglcontextrestored', onRestored);
          };
        }}
      >
        {children}
      </Canvas>
    </div>
  );
};

export interface StudioGridFloorProps {
  visible: boolean;
  span: number;
  renderMode?: StudioRenderMode;
  y?: number;
}

export const StudioGridFloor: React.FC<StudioGridFloorProps> = ({
  visible,
  span,
  renderMode = 'realistic',
  y = -0.195,
}) => {
  const techMode = renderMode === 'technical';
  if (!visible && !techMode) return null;
  const gridSize = Math.max(40, Math.ceil(span * 1.6));

  return (
    <Grid
      position={[0, y, 0]}
      args={[gridSize, gridSize]}
      cellSize={span > 55 ? 2 : span < 8 ? 0.5 : 1}
      cellThickness={0.55}
      cellColor={techMode ? '#18355E' : '#252D3A'}
      sectionSize={span > 55 ? 10 : span < 8 ? 2 : 5}
      sectionThickness={1}
      sectionColor={techMode ? '#295794' : '#334054'}
      fadeDistance={Math.max(30, span * 1.6)}
      fadeStrength={1.2}
    />
  );
};

export function getStudioLightingPreset(
  lightingMode: StudioLightingMode,
  renderMode: StudioRenderMode,
  isIndoor: boolean
) {
  const techMode = renderMode === 'technical';
  const archMode = renderMode === 'architectural';

  if (techMode) {
    return {
      bg: '#08101E',
      hemiSky: '#DCEBFF',
      hemiGround: '#10203A',
      hemiIntensity: 1.15,
      sunPos: [20, 32, 18] as [number, number, number],
      sunColor: '#FFFFFF',
      sunIntensity: 1.5,
    };
  }
  if (archMode) {
    return {
      bg: '#141820',
      hemiSky: '#F0F4FA',
      hemiGround: '#1B2028',
      hemiIntensity: 1.0,
      sunPos: [22, 34, 18] as [number, number, number],
      sunColor: '#F6F8FC',
      sunIntensity: 1.8,
    };
  }
  if (lightingMode === 'night') {
    return {
      bg: '#070A11',
      hemiSky: '#3A4E7A',
      hemiGround: '#0A0D14',
      hemiIntensity: 0.45,
      sunPos: [-12, 24, -10] as [number, number, number],
      sunColor: '#9DBEFF',
      sunIntensity: 0.55,
    };
  }
  if (lightingMode === 'sunset') {
    return {
      bg: '#1A1416',
      hemiSky: '#FFB78A',
      hemiGround: '#1B1A22',
      hemiIntensity: 0.72,
      sunPos: [32, 11, 22] as [number, number, number],
      sunColor: '#FF9E64',
      sunIntensity: 2.3,
    };
  }
  return {
    bg: isIndoor ? '#11141B' : '#141A24',
    hemiSky: '#E6EFFA',
    hemiGround: '#1A2029',
    hemiIntensity: isIndoor ? 0.85 : 0.78,
    sunPos: [24, 34, 18] as [number, number, number],
    sunColor: '#FFF9F0',
    sunIntensity: isIndoor ? 1.55 : 2.35,
  };
}
