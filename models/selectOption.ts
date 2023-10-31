import { EnrichedLevel } from './db/level';
import SelectOptionStats from './selectOptionStats';

interface SelectOption {
  author?: string | undefined;
  disabled?: boolean;
  height?: number;
  hideDifficulty?: boolean;
  href?: string;
  id: string;
  level?: EnrichedLevel | undefined;
  onClick?: () => void;
  stats?: SelectOptionStats | undefined;
  text: React.ReactNode;
  width?: number;
  hideAddToPlayLaterButton?: boolean;
  customStyle?: React.CSSProperties;
}

export default SelectOption;
