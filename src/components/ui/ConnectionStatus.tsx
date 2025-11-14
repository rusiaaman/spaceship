/**
 * Connection status indicator for multiplayer
 */

import { useMultiplayerStore } from '@/multiplayer/MultiplayerGameStore';

export function ConnectionStatus() {
  const isMultiplayer = useMultiplayerStore(state => state.isMultiplayer);
  const isConnected = useMultiplayerStore(state => state.isConnected);
  const latency = useMultiplayerStore(state => state.latency);
  const peerCount = useMultiplayerStore(state => state.remotePlayers.size);

  if (!isMultiplayer) return null;

  const getStatusColor = () => {
    if (!isConnected) return 'bg-red-500';
    if (latency > 150) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!isConnected) return 'Disconnected';
    if (latency > 150) return 'Poor';
    if (latency > 80) return 'Good';
    return 'Excellent';
  };

  return (
    <div className="fixed top-4 right-4 flex items-center gap-3 px-4 py-2 bg-black/70 backdrop-blur-sm border border-cyan-500/30 rounded-lg">
      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${isConnected ? 'animate-pulse' : ''}`} />
        <span className="text-sm text-white font-medium">{getStatusText()}</span>
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-gray-600" />

      {/* Latency */}
      {isConnected && (
        <div className="text-sm text-gray-300">
          <span className="text-gray-500">Ping:</span> {latency.toFixed(0)}ms
        </div>
      )}

      {/* Divider */}
      <div className="w-px h-4 bg-gray-600" />

      {/* Player Count */}
      <div className="text-sm text-gray-300">
        <span className="text-gray-500">Players:</span> {peerCount + 1}
      </div>
    </div>
  );
}