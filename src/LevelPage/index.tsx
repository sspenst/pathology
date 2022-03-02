import { useState, useEffect } from 'react';
import React from 'react';
import MenuOptions from '../Models/MenuOptions';
import { useSearchParams } from 'react-router-dom';
import Menu from '../Common/Menu';
import useWindowSize from '../Common/useWindowSize';
import Level from '../DataModels/Pathology/Level';
import Dimensions from '../Constants/Dimensions';
import Game from './Game';
import { WindowSizeContext } from '../Common/WindowSizeContext';

export default function LevelPage() {
  const [level, setLevel] = useState<Level>();
  const [menuOptions, setMenuOptions] = useState<MenuOptions>();
  const [searchParams] = useSearchParams();
  const levelId = searchParams.get('id');

  useEffect(() => {
    async function getLevel() {
      const response = await fetch(process.env.REACT_APP_SERVICE_URL + `levels?id=${levelId}`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const levels: Level[] = await response.json();
      const level = levels[0];

      setLevel(level);
    
      setMenuOptions(new MenuOptions(
        level.name,
        'pack',
        level.packId,
        level.author,
      ));
    }
  
    getLevel();
  }, [levelId]);

  useEffect(() => {
    async function getLevels() {
      // ensure level ids match to avoid making two requests when pressing prev or next
      if (!level || !levelId || levelId !== level._id) {
        return;
      }
  
      const response = await fetch(process.env.REACT_APP_SERVICE_URL + `levels?packId=${level.packId}`);
  
      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }
  
      const levels: Level[] = await response.json();
      const levelIds = levels.sort((a: Level, b: Level) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1)
        .map(level => level._id);

      const levelIdIndex = levelIds.indexOf(levelId);

      if (levelIdIndex === -1) {
        return;
      }

      let nextLevelId = undefined;
      let prevLevelId = undefined;

      if (levelIdIndex !== levelIds.length - 1) {
        nextLevelId = levelIds[levelIdIndex + 1];
      }

      if (levelIdIndex !== 0) {
        prevLevelId = levelIds[levelIdIndex - 1];
      }
    
      setMenuOptions(new MenuOptions(
        level.name,
        'pack',
        level.packId,
        level.author,
        nextLevelId,
        prevLevelId,
      ));
    }
  
    getLevels();
  }, [level, levelId]);

  const windowSize = useWindowSize();

  if (!level || !windowSize) {
    return null;
  }

  return (
    <WindowSizeContext.Provider value={windowSize}>
      <Menu
        menuOptions={menuOptions}
      />
      <Game
        key={level._id}
        level={level}
        top={Dimensions.MenuHeight}
      />
    </WindowSizeContext.Provider>
  );
}
