import React from 'react';
import Dimensions from '../../constants/dimensions';
import { EnrichedLevel } from '../../models/db/level';
import SelectOption from '../../models/selectOption';
import SelectOptionStats from '../../models/selectOptionStats';
import Select from './select';

interface LevelSelectProps {
  levels: EnrichedLevel[];
}

export default function LevelSelect({ levels }: LevelSelectProps) {
  if (levels.length === 0 ) {
    return (
      <div className='flex flex-wrap justify-center'>
        <div className='flex flex-col justify-center items-center text-xs italic'>
            No results
        </div>
      </div>);
  }

  return (
    <Select options={levels.map(level => {
      return {
        author: level.userId.name,
        height: Dimensions.OptionHeightLarge,
        href: `/level/${level.slug}`,
        id: level._id.toString(),
        level: level,
        stats: new SelectOptionStats(level.leastMoves, level.userMoves),
        text: level.name,
      } as SelectOption;
    })} />
  );
}