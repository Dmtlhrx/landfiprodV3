import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Sphere } from '@react-three/drei';
import * as THREE from 'three';

// Hedera Africa Hero Scene
const ParticleSystem: React.FC = () => {
  const ref = useRef<THREE.Points>(null);
  const [sphere] = useMemo(() => {
    const sphere = new THREE.BufferGeometry();
    const positions = new Float32Array(2000 * 3);
    
    // Create particles in a sphere formation
    for (let i = 0; i < 2000; i++) {
      const theta = THREE.MathUtils.randFloatSpread(360);
      const phi = THREE.MathUtils.randFloatSpread(360);
      const r = THREE.MathUtils.randFloat(1, 3);
      
      positions[i * 3] = r * Math.sin(theta) * Math.cos(phi);
      positions[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      positions[i * 3 + 2] = r * Math.cos(theta);
    }
    
    sphere.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return [sphere];
  }, []);

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 10;
      ref.current.rotation.y -= delta / 15;
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere.attributes.position} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#00D17A"
          size={0.05}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
    </group>
  );
};

const BeninOutline: React.FC = () => {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  // Simplified Benin country outline
  const shape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0, 2);
    shape.lineTo(0.8, 2.2);
    shape.lineTo(1.2, 1.8);
    shape.lineTo(1, 1);
    shape.lineTo(0.6, 0.2);
    shape.closePath();
    return shape;
  }, []);

  return (
    <mesh ref={ref}>
      <extrudeGeometry args={[shape, { depth: 0.1, bevelEnabled: false }]} />
      <meshStandardMaterial
        color="#00D17A"
        transparent
        opacity={0.7}
        emissive="#00D17A"
        emissiveIntensity={0.2}
      />
    </mesh>
  );
};

const Hero3D: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 1], fov: 75 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <ParticleSystem />
        <BeninOutline />
      </Canvas>
    </div>
  );
};

export default Hero3D;