import { useRef, useMemo, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { GAME_CONSTANTS } from '@/utils/constants';
import { Cylinder, Torus } from '@react-three/drei';

// Placeholder for AI Spaceship (must be forwardRef to be used with refs array)
const AISpaceship = forwardRef<THREE.Mesh, { position: [number, number, number], rotationY: number }>(({ position, rotationY }, ref) => {
    return (
        <mesh position={position} rotation-y={rotationY} ref={ref}>
            <boxGeometry args={[1, 1, 3]} />
            <meshStandardMaterial color="red" />
        </mesh>
    );
});

// Finish Disk component
const FinishDisk = () => {
    const { FINISH_DISK_RADIUS, RACE_DISTANCE } = GAME_CONSTANTS;
    
    // Position the disk far away on the negative Z axis
    const position: [number, number, number] = [0, 0, -RACE_DISTANCE];

    return (
        <group position={position} rotation-x={Math.PI / 2}>
            {/* Outer Ring */}
            <Torus args={[FINISH_DISK_RADIUS, 1, 16, 100]}>
                <meshBasicMaterial color="#00ff00" />
            </Torus>
            {/* Inner transparent disk */}
            <Cylinder args={[FINISH_DISK_RADIUS, FINISH_DISK_RADIUS, 0.1, 64, 1, true]}>
                <meshStandardMaterial color="#00ff00" transparent opacity={0.1} side={THREE.DoubleSide} />
            </Cylinder>
        </group>
    );
};

// AI Logic and rendering
const RaceElements = () => {
    const isRaceStarted = useGameStore((state) => state.isRaceStarted);
    
    const aiShipsData = useMemo(() => {
        return Array.from({ length: GAME_CONSTANTS.AI_COUNT }).map((_, i) => ({
            id: i,
            // Start positions slightly offset from player (0, 0, 0) and ahead
            initialPosition: [(i - (GAME_CONSTANTS.AI_COUNT - 1) / 2) * 15, 0, 50 + i * 10] as [number, number, number],
            speed: GAME_CONSTANTS.MAX_SPEED * GAME_CONSTANTS.AI_SPEED_MULTIPLIER * (1 - i * 0.05),
        }));
    }, []);

    const aiRefs = useRef<(THREE.Mesh | null)[]>([]);

    useFrame((_, delta) => {
        if (isRaceStarted) {
            aiRefs.current.forEach((mesh, index) => {
                if (mesh) {
                    // Simple forward movement (negative Z)
                    mesh.position.z -= aiShipsData[index].speed * delta;
                }
            });
        }
    });

    return (
        <group>
            <FinishDisk />
            {aiShipsData.map((ship, index) => (
                <AISpaceship 
                    key={ship.id} 
                    position={ship.initialPosition} 
                    rotationY={0} 
                    ref={el => { aiRefs.current[index] = el }}
                />
            ))}
        </group>
    );
};

export default RaceElements;