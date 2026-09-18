/**
 * NurseModel.jsx — Michelle.glb with correct face-forward camera framing
 * Michelle is ~1.8m tall (GLB meters). We position her so face is at y≈0.6
 * which is where the camera looks, giving a nice portrait/face view.
 */
import React, { useRef, useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

const MICHELLE = '/models/Michelle.glb';
const XBOT     = '/models/Xbot.glb';

export default function NurseModel({ state = 'idle', isSpeaking = false }) {
  const prevRef  = useRef(null);
  const sceneRef = useRef(null);
  const groupRef = useRef();

  const michelle = useGLTF(MICHELLE);
  const xbot     = useGLTF(XBOT);

  // Clone Michelle — keeps the cached original clean
  const clone = React.useMemo(() => {
    const c = SkeletonUtils.clone(michelle.scene);
    c.traverse((child) => {
      if (child.isMesh || child.isSkinnedMesh) {
        child.castShadow    = true;
        child.frustumCulled = false;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => {
          if (m.map) { m.map.colorSpace = THREE.SRGBColorSpace; m.map.needsUpdate = true; }
          m.side = THREE.DoubleSide;
          m.needsUpdate = true;
        });
      }
    });
    sceneRef.current = c;
    return c;
  }, [michelle.scene]);

  // Apply Xbot animations to Michelle clone via name-matching (both use mixamorig:)
  const { actions } = useAnimations(xbot.animations, clone);

  // Play idle on mount
  useEffect(() => {
    if (!actions) return;
    console.log('[NurseModel] clips:', Object.keys(actions));
    const idle = actions['idle'];
    if (idle) { idle.reset().play(); prevRef.current = idle; }
  }, [actions]);

  // State → animation
  useEffect(() => {
    if (!actions) return;
    const s   = (state || 'idle').toLowerCase();
    const spk = isSpeaking || s === 'speaking';

    // Only use clips that look natural as retargeted
    let clip = 'idle';
    if (spk)                    clip = 'idle';   // idle looks best while speaking
    else if (s === 'listening') clip = 'idle';
    else if (s === 'thinking')  clip = 'idle';

    const next = actions[clip] ?? actions['idle'];
    const prev = prevRef.current;
    if (next && next !== prev) {
      next.reset().fadeIn(0.5).play();
      prev?.fadeOut(0.5);
      prevRef.current = next;
    }
  }, [state, isSpeaking, actions]);

  // Procedural overlay — head nod and body sway
  useFrame(() => {
    const t = Date.now() / 1000;
    const s = (state || 'idle').toLowerCase();

    // Gentle body bob
    if (groupRef.current) {
      groupRef.current.position.y = -1.15 + Math.sin(t * 1.6) * 0.015;
    }

    const sc = sceneRef.current;
    if (!sc) return;

    // Find bones and animate them procedurally for better results
    sc.traverse((child) => {
      // Head: nod based on state
      if (child.name === 'mixamorig:Head') {
        if (s === 'greeting') {
          child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, 0.15 + Math.sin(t * 2.5) * 0.15, 0.08);
          child.rotation.y = THREE.MathUtils.lerp(child.rotation.y, Math.sin(t * 1.2) * 0.08, 0.08);
        } else if (isSpeaking || s === 'speaking') {
          child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, Math.sin(t * 4) * 0.18, 0.12);
          child.rotation.y = THREE.MathUtils.lerp(child.rotation.y, Math.sin(t * 2.1) * 0.10, 0.10);
        } else {
          child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, Math.sin(t * 0.8) * 0.05, 0.05);
          child.rotation.y = THREE.MathUtils.lerp(child.rotation.y, Math.sin(t * 0.6) * 0.06, 0.05);
        }
      }

      // Spine: gentle breathing sway
      if (child.name === 'mixamorig:Spine') {
        child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, Math.sin(t * 0.9) * 0.03, 0.04);
      }

      // Right arm wave during greeting
      if (s === 'greeting') {
        if (child.name === 'mixamorig:RightArm') {
          child.rotation.z = THREE.MathUtils.lerp(child.rotation.z, -1.3, 0.07);
        }
        if (child.name === 'mixamorig:RightForeArm') {
          child.rotation.z = THREE.MathUtils.lerp(child.rotation.z, -0.8, 0.07);
        }
        if (child.name === 'mixamorig:RightHand') {
          child.rotation.z = Math.sin(t * 9) * 0.85;
        }
      }

      // Speaking: right hand gesture
      if ((isSpeaking || s === 'speaking') && child.name === 'mixamorig:RightArm') {
        child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, -0.6 + Math.sin(t * 3) * 0.2, 0.08);
        child.rotation.z = THREE.MathUtils.lerp(child.rotation.z, -0.3, 0.08);
      }
    });
  });

  // Michelle face is at y≈1.6 from her feet.
  // position=[0,-1.15,0] → face at y≈0.45, feet at y=-1.15
  // Camera at [0, 0.55, 1.8] fov=42 looks exactly at the face.
  return (
    <group ref={groupRef} position={[0, -1.15, 0]} scale={1}>
      <primitive object={clone} />
    </group>
  );
}

useGLTF.preload(MICHELLE);
useGLTF.preload(XBOT);
