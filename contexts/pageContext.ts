import { createContext } from 'react';

interface PageContextInterface {
  preventKeyDownEvent: boolean;
  setPreventKeyDownEvent: React.Dispatch<React.SetStateAction<boolean>>;
  setShowHeader: React.Dispatch<React.SetStateAction<boolean>>;
  showHeader: boolean;
}

export const PageContext = createContext<PageContextInterface>({
  preventKeyDownEvent: false,
  setPreventKeyDownEvent: () => {},
  setShowHeader: () => {},
  showHeader: true,
});
