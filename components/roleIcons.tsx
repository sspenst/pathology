import User from '@root/models/db/user';
import Image from 'next/image';
import React from 'react';
import Role from '../constants/role';
import StyledTooltip from './styledTooltip';

interface RoleIconProps {
  role: Role;
  size: number;
}

function RoleIcon({ role, size }: RoleIconProps) {
  let icon = null;
  let tooltip = '';

  switch (role) {
  case (Role.ADMIN):
    // TODO: admin icon
    tooltip = 'Admin';
    break;
  case (Role.CURATOR):
    // TODO: curator icon
    tooltip = 'Curator';
    break;
  case (Role.PRO):
    icon = <Image alt='pro' src='/pro.svg' width={size} height={size} style={{ minWidth: size, minHeight: size }} />;
    tooltip = 'Pro Subscriber';
    break;
  }

  if (!icon) {
    return null;
  } else {
    return (<>
      <span data-tooltip-id={`tooltip-${role}`} data-tooltip-content={tooltip}>
        {icon}
      </span>
      <StyledTooltip id={`tooltip-${role}`} />
    </>);
  }
}

interface RoleIconsProps {
  size?: number;
  user: User;
}

export default function RoleIcons({ size = 16, user }: RoleIconsProps) {
  return (<>
    {user.roles?.map(role => <RoleIcon key={`${user._id.toString()}-${role.toString()}`} role={role} size={size} />)}
  </>);
}