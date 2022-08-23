import Link from 'next/link';
import React from 'react';
import { EnrichedLevel } from '../pages/search';

interface EnrichedLevelLinkProps {
  level: EnrichedLevel;
}

export default function EnrichedLevelLink({ level }: EnrichedLevelLinkProps) {
  return (
    <Link href={`/level/${level.slug}`} passHref prefetch={false}>
      <a
        className='font-bold underline'
        style={{
          color: level.userMoves ? (level.userMoves === level.leastMoves ? 'var(--color-complete)' : 'var(--color-incomplete)') : undefined,
        }}
      >
        {level.name}
      </a>
    </Link>
  );
}
