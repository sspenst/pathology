import { Menu, Transition } from '@headlessui/react';
import GameLogo from '@root/components/gameLogo';
import { Game, Games } from '@root/constants/Games';
import { AppContext } from '@root/contexts/appContext';
import getProfileSlug from '@root/helpers/getProfileSlug';
import isPro from '@root/helpers/isPro';
import useUrl from '@root/hooks/useUrl';
import classNames from 'classnames';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

function NavDivider() {
  return (
    <div className='h-px mx-2 my-1 bg-3' style={{ minHeight: 1 }} />
  );
}

interface NavGameMenuItemProps {
  game: Game;
}

function NavGameMenuItem({ game }: NavGameMenuItemProps) {
  const { game: currentGame } = useContext(AppContext);
  const getUrl = useUrl();
  const isCurrentGame = game.id === currentGame.id;
  // if you click the same game it should go back to '/'
  const path = isCurrentGame ? '/' : undefined;

  return (
    <Menu.Item>
      <a href={getUrl(game.id, path)} suppressHydrationWarning>
        <div className={classNames(
          'flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-5',
          isCurrentGame ? 'bg-2 hover-bg-4' : 'bg-1 hover-bg-3',
        )}>
          <GameLogo gameId={game.id} id={game.id} size={20} />
          <span>{game.displayName}</span>
        </div>
      </a>
    </Menu.Item>
  );
}

function NavGameMenu() {
  const { game: currentGame } = useContext(AppContext);

  return (
    // NB: need this relative outer div for the absolute menu to have the right width
    <div className='w-full relative'>
      <Menu>
        <Menu.Button className='w-full'>
          <div className='flex w-full items-center rounded-md cursor-pointer px-3 py-2 justify-between hover-bg-3'>
            <div className='flex items-center gap-5'>
              <GameLogo gameId={currentGame.id} id={currentGame.id} size={20} />
              <span>{currentGame.displayName}</span>
            </div>
            <svg className='h-5 w-5' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
              <path fillRule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clipRule='evenodd' />
            </svg>
          </div>
        </Menu.Button>
        <Transition
          as={Fragment}
          enter='transition ease-out duration-100'
          enterFrom='transform opacity-0 scale-95'
          enterTo='transform opacity-100 scale-100'
          leave='transition ease-in duration-75'
          leaveFrom='transform opacity-100 scale-100'
          leaveTo='transform opacity-0 scale-95'
        >
          <Menu.Items className='absolute w-full origin-top mt-1 p-1 rounded-[10px] shadow-lg border overflow-y-auto flex flex-col gap-1 bg-1 border-color-3'>
            {Object.values(Games).filter(game => game.id !== currentGame.id).map((game) => (
              <NavGameMenuItem game={game} key={game.id} />
            ))}
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
}

interface NavLinkProps {
  hidden?: boolean;
  href: string;
  icon: React.ReactNode;
  label: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

function NavLink({ hidden, href, icon, label, onClick }: NavLinkProps) {
  const [isActive, setIsActive] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsActive(router.asPath === href);
  }, [href, router.asPath]);

  if (hidden) {
    return null;
  }

  return (
    <Link href={href} onClick={onClick} passHref>
      <div className={classNames(
        'flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-5',
        isActive ? 'bg-2 hover-bg-4' : 'bg-1 hover-bg-3',
      )}>
        {icon}
        <span>{label}</span>
      </div>
    </Link>
  );
}

interface NavProps {
  isDropdown?: boolean;
}

export default function Nav({ isDropdown }: NavProps) {
  const { game, multiplayerSocket, playLater, user } = useContext(AppContext);
  const { connectedPlayersCount, matches, socket } = multiplayerSocket;

  const proNavLink = <NavLink
    href='/settings/pro'
    icon={<Image alt='pro' src='/pro.svg' width='20' height='20' />}
    label='Pro'
  />;

  const multiplayerNavLink = <NavLink
    hidden={game.disableMultiplayer}
    href='/multiplayer'
    icon={
      <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' />
      </svg>
    }
    label={
      <div className='flex flex-col'>
        <span>Multiplayer</span>
        {!socket?.connected || connectedPlayersCount === 0 ?
          <span className='text-xs text-yellow-500'>Connecting...</span>
          :
          <>
            <span className='text-xs text-green-500'>{`${connectedPlayersCount} player${connectedPlayersCount !== 1 ? 's' : ''} online`}</span>
            {matches.length > 0 &&
              <span className='text-xs text-green-300'>
                {`${matches.length} current match${matches.length === 1 ? '' : 'es'}`}
              </span>
            }
          </>
        }
      </div>
    }
  />;

  const createNavLink = <NavLink
    href='/create'
    icon={
      <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='2 2 20 20' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v2.25A2.25 2.25 0 006 10.5zm0 9.75h2.25A2.25 2.25 0 0010.5 18v-2.25a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25V18A2.25 2.25 0 006 20.25zm9.75-9.75H18a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0018 3.75h-2.25A2.25 2.25 0 0013.5 6v2.25a2.25 2.25 0 002.25 2.25z' />
      </svg>
    }
    label='Create'
  />;

  const yourLevelsNavLink = user && <NavLink
    href={`${getProfileSlug(user)}/levels`}
    icon={
      <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3' />
      </svg>
    }
    label='Your Levels'
  />;

  const rankedNavLink = <NavLink
    hidden={game.disableRanked}
    href='/ranked'
    icon={<span className='w-5 h-5 flex justify-center items-center text-xl'>🏅</span>}
    label='Ranked'
  />;

  const yourCollectionsNavLink = user && <NavLink
    href={`${getProfileSlug(user)}/collections`}
    icon={
      <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z' />
      </svg>
    }
    label='Your Collections'
  />;

  const playLaterNavLink = user && <NavLink
    href={`/collection/${user.name}/play-later`}
    icon={
      <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='w-5 h-5' viewBox='0 0 16 16'>
        <path d='M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z' />
        <path d='M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z' />
      </svg>
    }
    label='Play Later'
    onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!playLater || Object.keys(playLater).length === 0) {
        toast.success('Add a level to your Play Later collection first!', { icon: '➕', duration: 3000 });
        e.preventDefault();
      }
    }}
  />;

  const tutorialNavLink = !game.disableTutorial && <NavLink
    href='/tutorial'
    icon={
      <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='2 2 20 20' stroke='currentColor' strokeWidth={1}>
        <path d='M12 14l9-5-9-5-9 5 9 5z' />
        <path d='M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z' />
        <path strokeLinecap='round' strokeLinejoin='round' d='M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222' />
      </svg>
    }
    label='Tutorial'
  />;

  const campaignNavLink = <NavLink
    hidden={game.disableCampaign}
    href='/campaigns'
    icon={
      <svg xmlns='http://www.w3.org/2000/svg' fill='currentColor' className='w-5 h-5' viewBox='0 0 16 16'>
        <path d='M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z' />
      </svg>
    }
    label='Campaigns'
  />;

  const leaderboardNavLink = <NavLink
    href='/leaderboards'
    icon={
      <svg xmlns='http://www.w3.org/2000/svg' fill='currentColor' className='w-5 h-5' viewBox='0 0 16 16'>
        <path d='M2.5.5A.5.5 0 0 1 3 0h10a.5.5 0 0 1 .5.5c0 .538-.012 1.05-.034 1.536a3 3 0 1 1-1.133 5.89c-.79 1.865-1.878 2.777-2.833 3.011v2.173l1.425.356c.194.048.377.135.537.255L13.3 15.1a.5.5 0 0 1-.3.9H3a.5.5 0 0 1-.3-.9l1.838-1.379c.16-.12.343-.207.537-.255L6.5 13.11v-2.173c-.955-.234-2.043-1.146-2.833-3.012a3 3 0 1 1-1.132-5.89A33.076 33.076 0 0 1 2.5.5zm.099 2.54a2 2 0 0 0 .72 3.935c-.333-1.05-.588-2.346-.72-3.935zm10.083 3.935a2 2 0 0 0 .72-3.935c-.133 1.59-.388 2.885-.72 3.935zM3.504 1c.007.517.026 1.006.056 1.469.13 2.028.457 3.546.87 4.667C5.294 9.48 6.484 10 7 10a.5.5 0 0 1 .5.5v2.61a1 1 0 0 1-.757.97l-1.426.356a.5.5 0 0 0-.179.085L4.5 15h7l-.638-.479a.501.501 0 0 0-.18-.085l-1.425-.356a1 1 0 0 1-.757-.97V10.5A.5.5 0 0 1 9 10c.516 0 1.706-.52 2.57-2.864.413-1.12.74-2.64.87-4.667.03-.463.049-.952.056-1.469H3.504z' />
      </svg>
    }
    label='Leaderboards'
  />;

  const usersNavLink = <NavLink
    href='/users'
    icon={
      <svg xmlns='http://www.w3.org/2000/svg' fill='currentColor' className='w-5 h-5' viewBox='0 0 16 16'>
        <path fillRule='evenodd' d='M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5z' />
        <path d='M1.713 11.865v-.474H2c.217 0 .363-.137.363-.317 0-.185-.158-.31-.361-.31-.223 0-.367.152-.373.31h-.59c.016-.467.373-.787.986-.787.588-.002.954.291.957.703a.595.595 0 0 1-.492.594v.033a.615.615 0 0 1 .569.631c.003.533-.502.8-1.051.8-.656 0-1-.37-1.008-.794h.582c.008.178.186.306.422.309.254 0 .424-.145.422-.35-.002-.195-.155-.348-.414-.348h-.3zm-.004-4.699h-.604v-.035c0-.408.295-.844.958-.844.583 0 .96.326.96.756 0 .389-.257.617-.476.848l-.537.572v.03h1.054V9H1.143v-.395l.957-.99c.138-.142.293-.304.293-.508 0-.18-.147-.32-.342-.32a.33.33 0 0 0-.342.338v.041zM2.564 5h-.635V2.924h-.031l-.598.42v-.567l.629-.443h.635V5z' />
      </svg>
    }
    label='Users'
  />;

  const levelSearchNavLink = <NavLink
    href='/search'
    icon={
      <svg xmlns='http://www.w3.org/2000/svg' className='w-5 h-5' fill='none' viewBox='0 0 24 24'
        stroke='currentColor'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2'
          d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
      </svg>
    }
    label='Levels'
  />;

  const homeNavLink = <NavLink
    href='/'
    icon={
      <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25' />
      </svg>
    }
    label='Home'
  />;

  const profileNavLink = user && <NavLink
    href={getProfileSlug(user)}
    icon={
      <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z' />
      </svg>
    }
    label='Your Profile'
  />;

  const discordNavLink = <NavLink
    href='https://discord.gg/j6RxRdqq4A'
    icon={
      <Image alt='discord' src='/discord.svg' width='20' height='20' />
    }
    label='Discord'
  />;

  const playNavLink = !game.disableCampaign && <NavLink
    href='/play'
    icon={
      <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z' />
      </svg>
    }
    label='Play'
  />;

  return (
    <nav
      className={classNames(
        'w-60 border-color-4 bg-1 flex flex-col gap-1 overflow-y-auto',
        isDropdown ? 'p-1' : 'fixed p-2',
      )}
      style={{
        height: 'calc(100% - 48px)',
      }}
    >
      {homeNavLink}
      {user && <>
        {playNavLink}
        {rankedNavLink}
        {multiplayerNavLink}
      </>}
      <NavDivider />
      <NavGameMenu />
      <NavDivider />
      {user && <>
        {profileNavLink}
        {playLaterNavLink}
        {createNavLink}
        {yourLevelsNavLink}
        {yourCollectionsNavLink}
        <NavDivider />
      </>}
      {levelSearchNavLink}
      {usersNavLink}
      {campaignNavLink}
      {leaderboardNavLink}
      {tutorialNavLink}
      <NavDivider />
      {user && !isPro(user) && <>
        {proNavLink}
      </>}
      {discordNavLink}
    </nav>
  );
}