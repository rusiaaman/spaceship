/**
 * Manager for rendering all remote players
 */

import { useMultiplayerStore } from '@/multiplayer/MultiplayerGameStore';
import { RemotePlayer } from './RemotePlayer';

export function RemotePlayersManager() {
  const remotePlayers = useMultiplayerStore(state => state.remotePlayers);
  const isMultiplayer = useMultiplayerStore(state => state.isMultiplayer);

  if (!isMultiplayer) {
    return null;
  }

  return (
    <>
      {Array.from(remotePlayers.values()).map((player) => (
        <RemotePlayer key={player.id} player={player} />
      ))}
    </>
  );
}