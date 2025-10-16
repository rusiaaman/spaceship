import { useRef, useMemo, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { GAME_CONSTANTS } from '@/utils/constants';
import { Cylinder, Torus, Box } from '@react-three/drei';

interface AIShipProps {
    position: [number, number, number];
    rotationY: number;
    color: string;
}

// Enhanced AI Spaceship with better visibility
const AISpaceship = forwardRef<THREE.Group, AIShipProps>(({ position, rotationY, color }, ref) => {
    return (
        <group position={position} rotation-y={rotationY} ref={ref}>
            {/* Main body */}
            <Box args={[2, 1, 4]} position={[0, 0, 0]}>
                <meshStandardMaterial 
                    color={color} 
                    emissive={color}
                    emissiveIntensity={0.5}
                    metalness={0.8}
                    roughness={0.2}
                />
            </Box>
            {/* Wings */}
            <Box args={[6, 0.3, 2]} position={[0, 0, 0.5]}>
                <meshStandardMaterial 
                    color={color}
                    emissive={color}
                    emissiveIntensity={0.3}
                    metalness={0.6}
                    roughness={0.3}
                />
            </Box>
            {/* Cockpit */}
            <Box args={[1.2, 0.8, 1.5]} position={[0, 0.6, 0.5]}>
                <meshStandardMaterial 
                    color="#00ffff"
                    emissive="#00ffff"
                    emissiveIntensity={0.8}
                    transparent
                    opacity={0.6}
                />
            </Box>
            {/* Engine glow */}
            <pointLight position={[0, 0, -2]} color={color} intensity={2} distance={10} />
        </group>
    );
});

// Finish Disk component - Vertical disk facing the starting position
const FinishDisk = () => {
    const { FINISH_DISK_RADIUS, RACE_DISTANCE } = GAME_CONSTANTS;
    
    // Position the disk far away on the negative Z axis
    const position: [number, number, number] = [0, 0, -RACE_DISTANCE];

    return (
        <group position={position}>
            {/* Outer Ring - vertical, facing towards player */}
            <Torus args={[FINISH_DISK_RADIUS, 1, 16, 100]}>
                <meshBasicMaterial color="#00ff00" />
            </Torus>
            {/* Inner transparent disk - vertical, facing player */}
            <Cylinder args={[FINISH_DISK_RADIUS, FINISH_DISK_RADIUS, 0.1, 64, 1, true]} rotation-x={Math.PI / 2}>
                <meshStandardMaterial color="#00ff00" transparent opacity={0.1} side={THREE.DoubleSide} />
            </Cylinder>
            {/* Add glowing effect rings */}
            <Torus args={[FINISH_DISK_RADIUS * 0.8, 0.5, 16, 100]}>
                <meshBasicMaterial color="#00ff00" transparent opacity={0.5} />
            </Torus>
            <Torus args={[FINISH_DISK_RADIUS * 0.6, 0.3, 16, 100]}>
                <meshBasicMaterial color="#00ff00" transparent opacity={0.3} />
            </Torus>
        </group>
    );
};

interface AIShipData {
    id: number;
    name: string;
    initialPosition: [number, number, number];
    baseSpeed: number;
    acceleration: number;
    maxSpeed: number;
    color: string;
    currentSpeed: number;
}

// AI Logic and rendering
const RaceElements = () => {
    const isRaceStarted = useGameStore((state) => state.isRaceStarted);
    const gameState = useGameStore((state) => state.gameState);
    const setAIStandings = useGameStore((state) => state.setAIStandings);
    
    const aiShipsData = useMemo(() => {
        const colors = ['#ff4444', '#ff8800', '#ffff00', '#ff00ff', '#00ff88'];
        const names = ['Viper', 'Phoenix', 'Falcon', 'Thunder', 'Storm'];
        
        return Array.from({ length: GAME_CONSTANTS.AI_COUNT }).map((_, i) => ({
            id: i,
            name: names[i],
            // Start positions spread out horizontally
            initialPosition: [(i - (GAME_CONSTANTS.AI_COUNT - 1) / 2) * 15, 0, 20 + Math.random() * 10] as [number, number, number],
            baseSpeed: 40 + Math.random() * 20, // Random base speed
            acceleration: 30 + Math.random() * 20, // Random acceleration
            maxSpeed: 100 + Math.random() * 30, // Random max speed
            color: colors[i % colors.length],
            currentSpeed: 0,
        }));
    }, []);

    const aiRefs = useRef<(THREE.Group | null)[]>([]);
    const aiDataRef = useRef<AIShipData[]>(aiShipsData);

    useFrame((_, delta) => {
        if (isRaceStarted && gameState === 'playing') {
            const standings: Array<{ name: string; distance: number; position: number }> = [];
            
            aiRefs.current.forEach((group, index) => {
                if (group) {
                    const aiData = aiDataRef.current[index];
                    
                    // Accelerate AI ships with some randomness
                    const randomFactor = 0.95 + Math.random() * 0.1;
                    aiData.currentSpeed += aiData.acceleration * delta * randomFactor;
                    aiData.currentSpeed = Math.min(aiData.currentSpeed, aiData.maxSpeed);
                    
                    // Add slight random variations to make racing more dynamic
                    const speedVariation = (Math.random() - 0.5) * 5;
                    const actualSpeed = aiData.currentSpeed + speedVariation;
                    
                    // Move forward (negative Z)
                    group.position.z -= actualSpeed * delta;
                    
                    // Add slight horizontal movement for realism
                    const sway = Math.sin(Date.now() * 0.001 + index) * 0.02;
                    group.position.x += sway;
                    
                    // Calculate distance to finish
                    const distanceToFinish = Math.abs(group.position.z - (-GAME_CONSTANTS.RACE_DISTANCE));
                    
                    standings.push({
                        name: aiData.name,
                        distance: distanceToFinish,
                        position: 0, // Will be calculated after sorting
                    });
                    
                    // Check if AI finished
                    if (group.position.z <= -GAME_CONSTANTS.RACE_DISTANCE) {
                        const distanceFromCenter = Math.sqrt(
                            group.position.x * group.position.x + 
                            group.position.y * group.position.y
                        );
                        
                        if (distanceFromCenter <= GAME_CONSTANTS.FINISH_DISK_RADIUS) {
                            // AI finished - could add finish logic here
                            aiData.currentSpeed = 0;
                        }
                    }
                }
            });
            
            // Sort standings by distance (closest to finish = best position)
            standings.sort((a, b) => a.distance - b.distance);
            standings.forEach((standing, idx) => {
                standing.position = idx + 2; // +2 because player is position 1
            });
            
            setAIStandings(standings);
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
                    color={ship.color}
                    ref={el => { aiRefs.current[index] = el }}
                />
            ))}
        </group>
    );
};

export default RaceElements;