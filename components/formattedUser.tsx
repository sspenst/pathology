import Link from 'next/link';
import React from 'react';
import Dimensions from '../constants/dimensions';
import User from '../models/db/user';
import Avatar from './avatar';

interface FormattedUserProps {
  user: User;
}

export default function FormattedUser({ user }: FormattedUserProps) {
  return (
    <div className={'flex items-center gap-2'}>
      <Link href={`/profile/${user._id}`} passHref>
        <a>
          <Avatar size={Dimensions.AvatarSize} user={user}/>
        </a>
      </Link>
      <Link href={`/profile/${user._id}`} passHref>
        <a className='font-bold underline'>
          <span>{user.name}</span>
        </a>
      </Link>
    </div>
  );
}
