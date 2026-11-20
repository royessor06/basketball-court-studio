import React from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { SceneObject } from '../types/court';

export const SelectionRing: React.FC<{ selected: boolean; radius?: number }> = ({
  selected,
  radius = 1.2,
}) => {
  if (!selected) return null;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
      <ringGeometry args={[radius, radius + 0.09, 48]} />
      <meshBasicMaterial color="#F07827" side={THREE.DoubleSide} />
    </mesh>
  );
};

export const FootballGoalMesh: React.FC<{
  obj: SceneObject;
  isSelected: boolean;
  archMode: boolean;
  techMode: boolean;
}> = React.memo(({ obj, isSelected, archMode, techMode }) => {
  const goalW = obj.metadata?.goalWidthM ?? 7.32;
  const goalH = obj.metadata?.goalHeightM ?? 2.44;
  const goalD = obj.metadata?.goalDepthM ?? 2.0;
  const halfW = goalW / 2;
  const postRadius = goalW > 5 ? 0.06 : 0.045;
  const frameColor = techMode ? '#38BDF8' : archMode ? '#DCE3EC' : obj.color || '#F2F4F7';
  const netColor = techMode ? '#1686C9' : obj.secondaryColor || '#CBD5E1';

  return (
    <group>
      {/* Left & Right Uprights */}
      {[-halfW, halfW].map((z, idx) => (
        <mesh key={idx} position={[0, goalH / 2, z]} castShadow>
          <cylinderGeometry args={[postRadius, postRadius, goalH, 16]} />
          <meshStandardMaterial color={frameColor} roughness={0.32} metalness={0.62} />
        </mesh>
      ))}
      {/* Crossbar */}
      <mesh position={[0, goalH, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[postRadius, postRadius, goalW + postRadius * 2, 16]} />
        <meshStandardMaterial color={frameColor} roughness={0.32} metalness={0.62} />
      </mesh>
      {/* Rear ground base frame + vertical back stanchions */}
      <mesh position={[-goalD, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, goalW, 10]} />
        <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.75} />
      </mesh>
      {[-halfW, halfW].map((z, idx) => (
        <group key={idx}>
          <mesh position={[-goalD / 2, 0.03, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, goalD, 10]} />
            <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.75} />
          </mesh>
          <mesh position={[-goalD * 0.85, goalH * 0.5, z]} rotation={[0, 0, 0.16]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, goalH, 10]} />
            <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.75} />
          </mesh>
          <mesh position={[-goalD * 0.44, goalH * 0.94, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, goalD * 0.88, 10]} />
            <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.75} />
          </mesh>
        </group>
      ))}
      {/* Net mesh planes (top, back, sides) */}
      <mesh position={[-goalD / 2, goalH * 0.5, -halfW]}>
        <planeGeometry args={[goalD, goalH]} />
        <meshStandardMaterial color={netColor} wireframe transparent opacity={0.42} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-goalD / 2, goalH * 0.5, halfW]}>
        <planeGeometry args={[goalD, goalH]} />
        <meshStandardMaterial color={netColor} wireframe transparent opacity={0.42} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-goalD * 0.88, goalH * 0.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[goalW, goalH]} />
        <meshStandardMaterial color={netColor} wireframe transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-goalD * 0.44, goalH * 0.96, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[goalD * 0.88, goalW]} />
        <meshStandardMaterial color={netColor} wireframe transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      <SelectionRing selected={isSelected} radius={Math.max(1.5, halfW * 0.45)} />
    </group>
  );
});

export const HandballGoalMesh: React.FC<{
  obj: SceneObject;
  isSelected: boolean;
  archMode: boolean;
  techMode: boolean;
}> = React.memo(({ obj, isSelected, archMode, techMode }) => {
  const goalW = obj.metadata?.goalWidthM ?? 3.0;
  const goalH = obj.metadata?.goalHeightM ?? 2.0;
  const goalD = obj.metadata?.goalDepthM ?? 1.0;
  const halfW = goalW / 2;
  const primary = techMode ? '#38BDF8' : archMode ? '#F07827' : obj.color || '#DC2626';
  const stripe = techMode ? '#E6F2FF' : obj.secondaryColor || '#F2F4F7';

  return (
    <group>
      {/* Posts & Crossbar with alternating IHF stripes */}
      {[-halfW, halfW].map((z, idx) => (
        <group key={idx} position={[0, 0, z]}>
          {[0, 1, 2, 3, 4].map((seg) => (
            <mesh key={seg} position={[0, 0.2 + seg * (goalH / 5), 0]} castShadow>
              <boxGeometry args={[0.08, goalH / 5, 0.08]} />
              <meshStandardMaterial color={seg % 2 === 0 ? primary : stripe} roughness={0.4} metalness={0.35} />
            </mesh>
          ))}
          <mesh position={[-goalD / 2, 0.03, 0]} castShadow>
            <boxGeometry args={[goalD, 0.05, 0.05]} />
            <meshStandardMaterial color="#252C38" roughness={0.5} metalness={0.75} />
          </mesh>
          <mesh position={[-goalD * 0.88, goalH * 0.5, 0]} rotation={[0, 0, 0.14]} castShadow>
            <cylinderGeometry args={[0.022, 0.022, goalH, 8]} />
            <meshStandardMaterial color="#9AA4B2" roughness={0.4} metalness={0.8} />
          </mesh>
        </group>
      ))}
      {[0, 1, 2, 3, 4, 5].map((seg) => (
        <mesh key={seg} position={[0, goalH, -halfW + (seg + 0.5) * (goalW / 6)]} castShadow>
          <boxGeometry args={[0.08, 0.08, goalW / 6]} />
          <meshStandardMaterial color={seg % 2 === 0 ? primary : stripe} roughness={0.4} metalness={0.35} />
        </mesh>
      ))}
      <mesh position={[-goalD, 0.03, 0]} castShadow>
        <boxGeometry args={[0.05, 0.05, goalW]} />
        <meshStandardMaterial color="#252C38" roughness={0.5} metalness={0.75} />
      </mesh>
      <mesh position={[-goalD * 0.88, goalH * 0.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[goalW, goalH]} />
        <meshStandardMaterial color={stripe} wireframe transparent opacity={0.42} side={THREE.DoubleSide} />
      </mesh>
      <SelectionRing selected={isSelected} radius={1.65} />
    </group>
  );
});

export const VolleyballNetMesh: React.FC<{
  obj: SceneObject;
  isSelected: boolean;
  archMode: boolean;
  techMode: boolean;
}> = React.memo(({ obj, isSelected, archMode, techMode }) => {
  const topH = obj.metadata?.netHeightM ?? 2.43;
  const spanW = obj.metadata?.netWidthM ?? 10.0;
  const netSpanW = Math.max(6, spanW - 0.5);
  const halfPostZ = spanW / 2;
  const postColor = techMode ? '#38BDF8' : archMode ? '#B4BECA' : obj.color || '#1686C9';
  const tapeColor = techMode ? '#E6F2FF' : obj.secondaryColor || '#F2F4F7';

  return (
    <group>
      {/* Left & Right Tension Posts + Safety Padding */}
      {[-halfPostZ, halfPostZ].map((z, idx) => (
        <group key={idx} position={[0, 0, z]}>
          <mesh position={[0, 1.28, 0]} castShadow>
            <cylinderGeometry args={[0.048, 0.048, 2.56, 16]} />
            <meshStandardMaterial color={postColor} roughness={0.35} metalness={0.78} />
          </mesh>
          <mesh position={[0, 1.0, 0]} castShadow>
            <cylinderGeometry args={[0.085, 0.085, 1.9, 16]} />
            <meshStandardMaterial color={archMode ? '#9AA4B2' : '#F07827'} roughness={0.82} metalness={0.04} />
          </mesh>
        </group>
      ))}
      {/* Top & bottom white net tape */}
      <mesh position={[0, topH - 0.035, 0]} castShadow>
        <boxGeometry args={[0.03, 0.07, netSpanW]} />
        <meshStandardMaterial color={tapeColor} roughness={0.6} />
      </mesh>
      <mesh position={[0, topH - 0.96, 0]}>
        <boxGeometry args={[0.025, 0.05, netSpanW]} />
        <meshStandardMaterial color={tapeColor} roughness={0.6} />
      </mesh>
      {/* Net mesh body */}
      <mesh position={[0, topH - 0.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[netSpanW, 0.92, 24, 6]} />
        <meshStandardMaterial color="#D8E0EB" wireframe transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* Fiberglass boundary antennas */}
      {[-(netSpanW / 2 - 0.3), netSpanW / 2 - 0.3].map((z, idx) => (
        <mesh key={idx} position={[0, topH - 0.1, z]}>
          <cylinderGeometry args={[0.01, 0.01, 1.8, 8]} />
          <meshStandardMaterial color="#EF4444" roughness={0.5} />
        </mesh>
      ))}
      <SelectionRing selected={isSelected} radius={1.6} />
    </group>
  );
});

export const TennisNetMesh: React.FC<{
  obj: SceneObject;
  isSelected: boolean;
  archMode: boolean;
  techMode: boolean;
}> = React.memo(({ obj, isSelected, archMode, techMode }) => {
  const postH = obj.metadata?.netHeightM ?? 1.07;
  const spanW = obj.metadata?.netWidthM ?? 12.8;
  const halfPostZ = spanW / 2;
  const postColor = techMode ? '#38BDF8' : archMode ? '#9BA5B4' : obj.color || '#1A2029';
  const tapeColor = techMode ? '#E6F2FF' : obj.secondaryColor || '#F2F4F7';

  return (
    <group>
      {[-halfPostZ, halfPostZ].map((z, idx) => (
        <group key={idx} position={[0, 0, z]}>
          <mesh position={[0, postH / 2, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.045, postH, 14]} />
            <meshStandardMaterial color={postColor} roughness={0.35} metalness={0.8} />
          </mesh>
          <mesh position={[0, postH + 0.02, 0]}>
            <cylinderGeometry args={[0.052, 0.052, 0.04, 14]} />
            <meshStandardMaterial color="#D97706" roughness={0.4} metalness={0.6} />
          </mesh>
        </group>
      ))}
      {/* Center strap */}
      <mesh position={[0, 0.46, 0]} castShadow>
        <boxGeometry args={[0.04, 0.92, 0.05]} />
        <meshStandardMaterial color={tapeColor} roughness={0.7} />
      </mesh>
      {/* Tapered top headband via Line */}
      <Line
        points={[
          [0, postH, -halfPostZ],
          [0, 0.914, 0],
          [0, postH, halfPostZ],
        ]}
        color={tapeColor}
        lineWidth={3.2}
      />
      {/* Net mesh body */}
      <mesh position={[0, 0.48, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[spanW, 0.94, 32, 6]} />
        <meshStandardMaterial color="#1E242E" wireframe transparent opacity={0.65} side={THREE.DoubleSide} />
      </mesh>
      <SelectionRing selected={isSelected} radius={1.6} />
    </group>
  );
});

export const MultisportComboGoalMesh: React.FC<{
  obj: SceneObject;
  isSelected: boolean;
  archMode: boolean;
  techMode: boolean;
}> = React.memo(({ obj, isSelected, archMode, techMode }) => {
  const goalW = obj.metadata?.goalWidthM ?? 3.0;
  const goalH = obj.metadata?.goalHeightM ?? 2.0;
  const rimH = obj.metadata?.rimHeightM ?? 3.05;
  const halfW = goalW / 2;
  const frameColor = techMode ? '#38BDF8' : archMode ? '#B4BECA' : obj.color || '#202630';
  const accentColor = techMode ? '#F07827' : obj.secondaryColor || '#F07827';

  return (
    <group>
      {/* Lower Steel Football/Handball Cage (3×2 m) */}
      {[-halfW, halfW].map((z, idx) => (
        <group key={idx}>
          <mesh position={[0, goalH / 2, z]} castShadow>
            <boxGeometry args={[0.09, goalH, 0.09]} />
            <meshStandardMaterial color={frameColor} roughness={0.35} metalness={0.85} />
          </mesh>
          <mesh position={[-0.45, 0.04, z]} castShadow>
            <boxGeometry args={[0.9, 0.06, 0.06]} />
            <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.8} />
          </mesh>
          <mesh position={[-0.9, goalH / 2, z]} castShadow>
            <boxGeometry args={[0.06, goalH, 0.06]} />
            <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.8} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, goalH, 0]} castShadow>
        <boxGeometry args={[0.09, 0.09, goalW + 0.1]} />
        <meshStandardMaterial color={frameColor} roughness={0.35} metalness={0.85} />
      </mesh>
      {/* Steel bar back mesh */}
      <mesh position={[-0.9, goalH / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[goalW, goalH, 12, 8]} />
        <meshStandardMaterial color="#64748B" wireframe transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
      {/* Integrated Overhead Basketball Mast & Solid Backboard */}
      <mesh position={[-0.35, (goalH + rimH + 0.9) / 2, 0]} castShadow>
        <boxGeometry args={[0.14, rimH + 0.9 - goalH, 0.14]} />
        <meshStandardMaterial color={frameColor} roughness={0.35} metalness={0.85} />
      </mesh>
      <mesh position={[0.1, rimH + 0.35, 0]} castShadow>
        <boxGeometry args={[0.04, 0.95, 1.35]} />
        <meshStandardMaterial color="#EEF2F6" roughness={0.45} metalness={0.2} />
      </mesh>
      {/* Shooter square & Rim */}
      <mesh position={[0.13, rimH + 0.22, 0]}>
        <boxGeometry args={[0.01, 0.42, 0.56]} />
        <meshStandardMaterial color={accentColor} roughness={0.5} />
      </mesh>
      <mesh position={[0.38, rimH, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.23, 0.012, 12, 28]} />
        <meshStandardMaterial color={accentColor} roughness={0.3} metalness={0.75} />
      </mesh>
      <SelectionRing selected={isSelected} radius={1.7} />
    </group>
  );
});

export const DugoutShelterMesh: React.FC<{
  obj: SceneObject;
  isSelected: boolean;
  archMode: boolean;
  techMode: boolean;
}> = React.memo(({ obj, isSelected, archMode, techMode }) => {
  const frameColor = techMode ? '#38BDF8' : archMode ? '#B4BECA' : obj.color || '#202630';
  const seatColor = techMode ? '#F07827' : obj.secondaryColor || '#1686C9';

  return (
    <group>
      {/* Frame pillars */}
      {[-2.2, 0, 2.2].map((x, idx) => (
        <group key={idx} position={[x, 0, -0.55]}>
          <mesh position={[0, 1.05, 0]} castShadow>
            <boxGeometry args={[0.08, 2.1, 0.08]} />
            <meshStandardMaterial color={frameColor} roughness={0.38} metalness={0.82} />
          </mesh>
          <mesh position={[0, 2.08, 0.55]} rotation={[0.18, 0, 0]} castShadow>
            <boxGeometry args={[0.06, 0.06, 1.25]} />
            <meshStandardMaterial color={frameColor} roughness={0.38} metalness={0.82} />
          </mesh>
        </group>
      ))}
      {/* Polycarbonate canopy & back glazing */}
      <mesh position={[0, 2.06, 0]} rotation={[0.18, 0, 0]} castShadow>
        <boxGeometry args={[4.6, 0.03, 1.28]} />
        <meshPhysicalMaterial color="#B8D4EE" transparent opacity={0.42} roughness={0.12} metalness={0.1} />
      </mesh>
      <mesh position={[0, 1.02, -0.58]}>
        <boxGeometry args={[4.5, 1.9, 0.02]} />
        <meshPhysicalMaterial color="#B8D4EE" transparent opacity={0.28} roughness={0.15} />
      </mesh>
      {/* Team bench plank */}
      <mesh position={[0, 0.44, -0.15]} castShadow receiveShadow>
        <boxGeometry args={[4.2, 0.08, 0.45]} />
        <meshStandardMaterial color={seatColor} roughness={0.62} metalness={0.15} />
      </mesh>
      <SelectionRing selected={isSelected} radius={2.5} />
    </group>
  );
});

export const CornerFlagMesh: React.FC<{
  obj: SceneObject;
  isSelected: boolean;
  archMode: boolean;
}> = React.memo(({ obj, isSelected, archMode }) => (
  <group>
    <mesh position={[0, 0.8, 0]} castShadow>
      <cylinderGeometry args={[0.02, 0.022, 1.6, 10]} />
      <meshStandardMaterial color={archMode ? '#DCE3EC' : obj.color || '#F2F4F7'} roughness={0.4} metalness={0.2} />
    </mesh>
    <mesh position={[0.16, 1.42, 0]} castShadow>
      <boxGeometry args={[0.32, 0.24, 0.015]} />
      <meshStandardMaterial color={obj.secondaryColor || '#F07827'} roughness={0.7} />
    </mesh>
    <SelectionRing selected={isSelected} radius={0.45} />
  </group>
));
