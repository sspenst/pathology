import PagePath from '@root/constants/pagePath';
import { useTour } from '@root/hooks/useTour';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import React, { useCallback } from 'react';
import { CallBackProps } from 'react-joyride';
import FormattedCampaign from '../../components/formattedCampaign';
import LinkInfo from '../../components/linkInfo';
import Page, { PAGE_PATH } from '../../components/page';
import getCampaignProps, { CampaignProps } from '../../helpers/getCampaignProps';
import { getUserFromToken } from '../../lib/withAuth';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (!reqUser) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return await getCampaignProps(reqUser, 'chapter1');
}

/* istanbul ignore next */
export default function Chapter1Page({ completedLevels, enrichedCollections, reqUser, totalLevels }: CampaignProps) {
  const memoizedCallback = useCallback((data: CallBackProps) => {
    if (data.action === 'next' && data.index === 0) {
      // get the first level a tag
      const firstLevel = document.querySelector('#level-selectcard-0 a');

      if (firstLevel) {
        (firstLevel as HTMLAnchorElement).click();
      }
    }
  }, []);
  const tour = useTour(PagePath.CHAPTER_1, memoizedCallback);

  return (
    <Page folders={[new LinkInfo('Chapter Select', '/play')]} title={'Chapter 1'}>
      <>
        {tour}
        <FormattedCampaign
          completedElement={
            <div className='flex flex-col items-center justify-center text-center mt-2'>
              <div>Congratulations! You&apos;ve completed every level in Chapter 1. Try out <Link className='font-bold underline' href='/chapter2' passHref>Chapter 2</Link> next!</div>
            </div>
          }
          completedLevels={completedLevels}
          enrichedCollections={enrichedCollections}
          levelHrefQuery={'chapter=1'}
          nextHref={'/chapter2'}
          nextTitle={(reqUser.chapterUnlocked ?? 1) < 2 ? 'Unlock Chapter 2' : undefined}
          subtitle={'Grassroots'}
          title={'Chapter 1'}
          totalLevels={totalLevels}
        />
      </>
    </Page>
  );
}
