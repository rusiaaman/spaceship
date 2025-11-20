import styled from '@emotion/styled'
import { useGameStore } from '@/store/gameStore'

const SettingsContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(15px);
  z-index: 200;
  font-family: 'Orbitron', monospace;
`

const SettingsPanel = styled.div`
  background: rgba(10, 22, 40, 0.95);
  padding: 40px;
  border-radius: 12px;
  border: 2px solid var(--hud-cyan);
  box-shadow: 0 0 40px rgba(0, 212, 255, 0.3);
  min-width: 500px;
`

const Title = styled.h2`
  font-size: 36px;
  color: var(--hud-cyan);
  text-shadow: 0 0 20px var(--glow-blue);
  margin-bottom: 30px;
  letter-spacing: 4px;
  text-align: center;
`

const SettingGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 30px;
`

const SettingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  border: 1px solid rgba(0, 212, 255, 0.2);
  transition: all 0.3s ease;
  
  &:hover {
    border-color: var(--hud-cyan);
    background: rgba(0, 212, 255, 0.1);
  }
`

const SettingLabel = styled.label`
  font-size: 16px;
  color: var(--hud-cyan);
  letter-spacing: 1px;
  cursor: pointer;
`

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 60px;
  height: 30px;
  cursor: pointer;
  
  input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  .slider {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    border: 2px solid rgba(0, 212, 255, 0.3);
    transition: 0.3s;
    border-radius: 30px;
    
    &:before {
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: 3px;
      bottom: 3px;
      background-color: rgba(0, 212, 255, 0.5);
      transition: 0.3s;
      border-radius: 50%;
    }
  }
  
  input:checked + .slider {
    background-color: rgba(0, 212, 255, 0.2);
    border-color: var(--hud-cyan);
  }
  
  input:checked + .slider:before {
    transform: translateX(30px);
    background-color: var(--hud-cyan);
    box-shadow: 0 0 10px var(--glow-blue);
  }
`

const ButtonGroup = styled.div`
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
`

const Button = styled.button`
  padding: 12px 40px;
  font-size: 16px;
  font-family: 'Orbitron', monospace;
  color: var(--hud-cyan);
  background: transparent;
  border: 2px solid var(--hud-cyan);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 2px;
  pointer-events: all;
  
  &:hover {
    background: var(--hud-cyan);
    color: #000000;
    box-shadow: 0 0 20px var(--glow-blue);
  }
  
  &:focus-visible {
    outline: 2px solid var(--hud-cyan);
    outline-offset: 4px;
  }
`

interface SettingsProps {
  onClose: () => void
}

export const Settings = ({ onClose }: SettingsProps) => {
  const settings = useGameStore((state) => state.settings)
  const toggleStarField = useGameStore((state) => state.toggleStarField)
  const toggleBoosters = useGameStore((state) => state.toggleBoosters)

  return (
    <SettingsContainer onClick={onClose}>
      <SettingsPanel onClick={(e) => e.stopPropagation()}>
        <Title>SETTINGS</Title>
        
        <SettingGroup>
          <SettingRow>
            <SettingLabel htmlFor="starfield-toggle">
              Star Field
            </SettingLabel>
            <ToggleSwitch>
              <input
                type="checkbox"
                id="starfield-toggle"
                checked={settings.starFieldEnabled}
                onChange={toggleStarField}
              />
              <span className="slider"></span>
            </ToggleSwitch>
          </SettingRow>
          
          <SettingRow>
            <SettingLabel htmlFor="boosters-toggle">
              Speed Boosters
            </SettingLabel>
            <ToggleSwitch>
              <input
                type="checkbox"
                id="boosters-toggle"
                checked={settings.boostersEnabled}
                onChange={toggleBoosters}
              />
              <span className="slider"></span>
            </ToggleSwitch>
          </SettingRow>
        </SettingGroup>
        
        <ButtonGroup>
          <Button onClick={onClose}>CLOSE</Button>
        </ButtonGroup>
      </SettingsPanel>
    </SettingsContainer>
  )
}