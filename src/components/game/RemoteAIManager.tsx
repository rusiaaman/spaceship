/**
 * Manager for rendering remote AI ships (peer only)
 */

import { useMultiplayerStore } from '@/multiplayer/MultiplayerGameStore';
import { getMultiplayerController } from '@/multiplayer/MultiplayerController';
import { RemoteAIShip } from './RemoteAIShip';

export function RemoteAIManager() {
  const isMultiplayer = useMultiplayerStore(state => state.isMultiplayer);
  const isHost = useMultiplayerStore(state => state.isHost);

  // Only render for peers (not host)
  if (!isMultiplayer || isHost) {
    return null;
  }

  const controller = getMultiplayerController();
  const aiStates = controller.getAISync().getAllAIStates();

  return (
    <>
      {aiStates.map((aiState) => (
        <RemoteAIShip key={aiState.id} aiState={aiState} />
      ))}
    </>
  );
}