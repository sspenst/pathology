import { FormattedDifficulty } from '@root/components/formatted/formattedDifficulty';
import Complete from '@root/components/level/info/complete';
import Dimensions from '@root/constants/dimensions';
import SelectOption from '@root/models/selectOption';
import classNames from 'classnames';
import React from 'react';

interface SelectCardContentProps {
  option: SelectOption;
}

export default function SelectCardContent({ option }: SelectCardContentProps) {
  return (<>
    <div
      className='font-bold break-words p-2'
      style={{
        width: Dimensions.OptionWidth,
      }}
    >
      <div className={classNames('truncate', (option.text as string)?.length >= 20 ? 'text-sm' : 'text-lg')}>
        {option.text}
      </div>
      <div className='text-sm'>
        {option.author && <div className='pt-1 italic truncate'>{option.author}</div>}
        {!option.hideDifficulty && option.level &&
          <div className='pt-1'>
            {FormattedDifficulty(
              option.level.calc_difficulty_estimate,
              option.id,
              option.level.calc_playattempts_unique_users_count !== undefined ?
                option.level.calc_playattempts_unique_users_count :
                option.level.calc_playattempts_unique_users.length
            )}
          </div>
        }
        {option.stats && <div className='pt-1 italic'>{option.stats.getText()}</div>}
      </div>
    </div>
    {option.stats?.isComplete() &&
      <div className='absolute bottom-0 right-0'>
        <Complete />
      </div>
    }
  </>);
}