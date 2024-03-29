import { multiplayerMatchTypeToText } from '@root/helpers/multiplayerHelperFunctions';
import React from 'react';
import { toast } from 'react-hot-toast';
import Select, { CSSObjectWithLabel } from 'react-select';
import { MultiplayerMatchType } from '../../models/constants/multiplayer';
import Modal from '.';

interface CreateMatchModalProps {
  closeModal: () => void;
  isOpen: boolean;
  onConfirm: (matchType: MultiplayerMatchType, isPrivate: boolean, isRated: boolean) => void;
}

export default function CreateMatchModal({ closeModal, isOpen, onConfirm }: CreateMatchModalProps) {
  const [isPrivate, setIsPrivate] = React.useState(false);
  const [isRated, setIsRated] = React.useState(true);
  const [matchType, setMatchType] = React.useState<MultiplayerMatchType>();

  const options = Object.values(MultiplayerMatchType).map(type => {
    return {
      label: multiplayerMatchTypeToText(type),
      value: type,
    };
  });

  const defaultValue = options.find(option => option.value === matchType);

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      onConfirm={() => {
        if (!matchType) {
          toast.dismiss();
          toast.error('Please select a game type');

          return;
        }

        onConfirm(matchType, isPrivate, isRated);
      }}
      title={'Create Match'}
    >
      <div className='items-center flex flex-col '>
        <div className='p-3'>
          <span className=''>Start a multiplayer match and invite your friends to play!</span>
        </div>
        <div>
          <div className='p-1 grid grid-cols-2 items-center gap-2'>
            <div className='p-1 flex flex-col'>
              <div className='p-1 flex flex-row gap-2'>
                <input id='chk_private'
                  checked={isPrivate}
                  className='self-center mb-2'
                  name='private'
                  type='checkbox'
                  onChange={(checkbox: React.ChangeEvent<HTMLInputElement>) => {
                    setIsPrivate(checkbox.target.checked);
                  }} />
                <label className='block font-bold mb-2  self-center' htmlFor='chk_private'>
            Private?
                </label>

              </div>
              <div className='p-1 flex flex-row gap-2'>
                <input id='chk_rated' checked={isRated} className='self-center mb-2' name='rated' type='checkbox' onChange={(checkbox: React.ChangeEvent<HTMLInputElement>) => {
                  setIsRated(checkbox.target.checked);
                }} />
                <label className='block font-bold mb-2  self-center' htmlFor='chk_rated'>
            Rated?
                </label>

              </div>
            </div>
            <Select
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onChange={(option: any) => {
                setMatchType(option.value);
              }}
              defaultValue={defaultValue}
              isSearchable={false}
              styles={{
                menuPortal: base => ({ ...base, zIndex: 9999, color: 'black' }) as CSSObjectWithLabel,
                menu: base => ({ ...base, zIndex: 9999 }) as CSSObjectWithLabel,
                // adjust width of dropdown
                control: base => ({ ...base, width: '200px' }) as CSSObjectWithLabel,
              }}
              placeholder='Game type'
              className='text-black'
              menuPortalTarget={(typeof window !== 'undefined') ? document.body : null}
              components={{
                IndicatorSeparator: null,
              }}
              formatOptionLabel={({ label }: {label: string, value: MultiplayerMatchType}) => {
                const [type, time] = label.split(' ');

                return (
                  <div className='flex flex-row gap-2'>
                    <span>{type}</span>
                    <span className='text-gray-500'>{time}</span>
                  </div>
                );
              }
              }
              options={options}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
