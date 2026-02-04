'use client';

import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { AtomComponentProps } from '@/AtomRegisty';
import { ThreeJSSceneParams, ThreeJSObject, ThreeJSObjectAnimation } from '@/OSDL.types';
import { GLTF } from 'three-stdlib';

interface ThreeJSSceneAtomProps extends AtomComponentProps, ThreeJSSceneParams {}

// Helper to set a value on an object by a string path like "rotation.y"
const setPropertyByPath = (obj: any, path: string, value: any) => {
    const parts = path.split('.');
    const last = parts.pop();
    if (!last) return;
    const target = parts.reduce((o, i) => (o ? o[i] : {}), obj);
    if (target) {
        target[last] = value;
    }
};

const lerp = (v0: number, v1: number, t: number) => {
    return v0 * (1 - t) + v1 * t;
};

const applyAnimation = (
    objectRef: React.MutableRefObject<THREE.Object3D | undefined>,
    animation: ThreeJSObjectAnimation,
    delta: number,
    clock: THREE.Clock
) => {
    if (!objectRef.current) return;

    const { property, loopType, durationMs, keyframes } = animation;
    if (!keyframes || keyframes.length === 0) return; // Guard against missing keyframes

    const durationSec = durationMs / 1000;
    const elapsedTime = clock.getElapsedTime();

    let progress: number;
    switch (loopType) {
        case 'repeat':
            progress = (elapsedTime % durationSec) / durationSec;
            break;
        case 'pingpong':
            const t = (elapsedTime % durationSec) / durationSec;
            progress = t < 0.5 ? t * 2 : (1 - t) * 2;
            break;
        case 'once':
        default:
            progress = Math.min(elapsedTime / durationSec, 1);
            break;
    }
    
    let currentKeyframeIndex = keyframes.findIndex(kf => kf.time >= progress);

    if (currentKeyframeIndex === -1) {
        // If progress is beyond the last keyframe, clamp to the end
        currentKeyframeIndex = keyframes.length - 1;
    }
    if (currentKeyframeIndex === 0) {
      // If progress is before the first keyframe, start with the first segment
      currentKeyframeIndex = 1;
    }
    // Ensure we don't go out of bounds if there's only one keyframe
    if (keyframes.length === 1) currentKeyframeIndex = 1;

    const startKeyframe = keyframes[currentKeyframeIndex - 1] || keyframes[0];
    const endKeyframe = keyframes[currentKeyframeIndex] || keyframes[keyframes.length - 1];

    const segmentDuration = endKeyframe.time - startKeyframe.time;
    const progressInSegment = segmentDuration > 0 ? (progress - startKeyframe.time) / segmentDuration : 1;

    const animatedValue = lerp(startKeyframe.value, endKeyframe.value, progressInSegment);

    setPropertyByPath(objectRef.current, property, animatedValue);
};

const GltfModel: React.FC<{ schema: ThreeJSObject; objectRef: React.MutableRefObject<THREE.Object3D> }> = ({ schema, objectRef }) => {
    // Always call useGLTF hook, but handle the case where sourceUrl might be undefined
    const gltf = useGLTF(schema.sourceUrl || '') as GLTF;
    
    // Return null if no sourceUrl was provided
    if (!schema.sourceUrl) return null;
    
    return <primitive 
        ref={objectRef}
        object={gltf.scene.clone()} 
        position={schema.position} 
        rotation={schema.rotation}
        scale={schema.scale}
    />;
};

const SceneObject: React.FC<{ objectSchema: ThreeJSObject }> = ({ objectSchema }) => {
    const objectRef = useRef<THREE.Object3D>(null);

    useFrame((state, delta) => {
        if (objectSchema.animations && objectRef.current) {
            objectSchema.animations.forEach(anim => {
                applyAnimation(objectRef as React.MutableRefObject<THREE.Object3D>, anim, delta, state.clock);
            });
        }
    });

    // Always call useLoader hook, but handle the case where textureUrl might be undefined
    const texture = useLoader(THREE.TextureLoader, objectSchema.material?.textureUrl || '');
    
    const materialProps: THREE.MeshStandardMaterialParameters = {
        color: objectSchema.material?.color || '#ffffff',
    };

    // Only set texture if it was actually loaded (textureUrl was provided)
    if (objectSchema.material?.textureUrl && texture) {
        materialProps.map = texture;
    }
    
    let material;
    switch (objectSchema.material?.type) {
        case 'phong':
            material = <meshPhongMaterial {...materialProps} />;
            break;
        case 'basic':
            material = <meshBasicMaterial {...materialProps} />;
            break;
        case 'standard':
        default:
            material = <meshStandardMaterial {...materialProps} />;
            break;
    }

    switch (objectSchema.type) {
        case 'gltf_model':
            return <Suspense fallback={null}><GltfModel schema={objectSchema} objectRef={objectRef as React.MutableRefObject<THREE.Object3D>} /></Suspense>;
        case 'sphere':
            return (
                <mesh ref={objectRef as React.MutableRefObject<THREE.Mesh>} position={objectSchema.position} rotation={objectSchema.rotation} scale={objectSchema.scale}>
                    <sphereGeometry args={[1, 32, 32]} />
                    {material}
                </mesh>
            );
        case 'torus':
            return (
                <mesh ref={objectRef as React.MutableRefObject<THREE.Mesh>} position={objectSchema.position} rotation={objectSchema.rotation} scale={objectSchema.scale}>
                    <torusGeometry args={[1, 0.4, 32, 100]} />
                    {material}
                </mesh>
            );
        case 'cube':
        default:
            return (
                <mesh ref={objectRef as React.MutableRefObject<THREE.Mesh>} position={objectSchema.position} rotation={objectSchema.rotation} scale={objectSchema.scale}>
                    <boxGeometry args={[1, 1, 1]} />
                    {material}
                </mesh>
            );
    }
};

const ThreeJSSceneAtom: React.FC<ThreeJSSceneAtomProps> = (props) => {
    const { sceneSetup, objects, enableControls, style, className, id } = props;

    return (
        <div id={id} className={className} style={style}>
            <Canvas camera={{ position: sceneSetup?.cameraPosition || [0, 0, 5] }}>
                <Suspense fallback={null}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} />
                    {sceneSetup?.backgroundColor && <color attach="background" args={[sceneSetup.backgroundColor]} />}
                    
                    {objects?.map(obj => <SceneObject key={obj.id} objectSchema={obj} />)}

                    {enableControls && <OrbitControls />}
                </Suspense>
            </Canvas>
        </div>
    );
};

export default ThreeJSSceneAtom; 