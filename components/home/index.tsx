import StatFilter from '@root/constants/statFilter';
import TourPath from '@root/constants/tourPath';
import isFullAccount from '@root/helpers/isFullAccount';
import isGuest from '@root/helpers/isGuest';
import { ScreenSize } from '@root/hooks/useDeviceCheck';
import classNames from 'classnames';
import Link from 'next/link';
import React, { useContext } from 'react';
import TimeRange from '../../constants/timeRange';
import { AppContext } from '../../contexts/appContext';
import useTour from '../../hooks/useTour';
import { EnrichedLevel } from '../../models/db/level';
import Review from '../../models/db/review';
import User from '../../models/db/user';
import Card from '../cards/card';
import ChapterSelectCard from '../cards/chapterSelectCard';
import LevelCard from '../cards/levelCard';
import LevelCardWithTitle from '../cards/levelCardWithTitle';
import LoadingCard from '../cards/loadingCard';
import FormattedReview from '../level/reviews/formattedReview';
import LoadingSpinner from '../page/loadingSpinner';

interface HomeProps {
  latestLevels?: EnrichedLevel[];
  latestReviews?: Review[];
  levelOfDay?: EnrichedLevel | null;
  recommendedLevel?: EnrichedLevel | null;
  topLevelsThisMonth?: EnrichedLevel[];
  user: User | null;
}

export default function Home({
  latestLevels,
  latestReviews,
  levelOfDay,
  recommendedLevel,
  topLevelsThisMonth,
  user,
}: HomeProps) {
  const { deviceInfo, game, userConfig } = useContext(AppContext);
  const tour = useTour(TourPath.HOME);

  function getSuggestedAction() {
    if (userConfig === undefined) {
      return null;
    }

    // suggest the tutorial if it hasn't been completed
    if (!userConfig?.tutorialCompletedAt) {
      if (game.disableTutorial) {
        return null;
      }

      return (
        <Card id='campaign' title={game.displayName + ' Tutorial'}>
          <ChapterSelectCard chapter={0} />
        </Card>
      );
    }

    // next suggest the next campaign chapter
    if (game.disableCampaign) {
      return null;
    }

    return (
      <Card id='campaign' title={game.displayName + ' Official Campaign'}>
        <ChapterSelectCard chapter={userConfig?.chapterUnlocked ?? 1} href='/play' />
      </Card>
    );
  }

  return (<>
    {tour}
    {user && !isFullAccount(user) &&
      <div className='bg-yellow-200 w-full text-black text-center text-sm p-2 shadow-lg'>
        {`${isGuest(user) ? 'Convert to a regular account' : 'Confirm your email'} in your `}
        <Link className='font-semibold text-blue-600 hover:underline' href='/settings/account'>
          Account Settings
        </Link>
        {' to unlock all basic features!'}
      </div>
    }
    <div className='flex justify-center m-6'>
      <div className='flex flex-col items-center gap-8 w-full max-w-screen-2xl'>
        <div className='flex flex-wrap justify-center gap-6 max-w-full'>
          {getSuggestedAction()}
          <LevelCardWithTitle
            id='level-of-day'
            level={levelOfDay}
            title='Level of the Day'
            tooltip={'Every day there is a new level of the day. Difficulty increases throughout the week!'}
          />
          <LevelCardWithTitle
            id='recommended-level'
            level={recommendedLevel}
            title='Try this Level'
            tooltip={'This is a quality level with similar difficulty to levels you\'ve played recently.'}
          />
        </div>
        <div className={classNames(
          'w-full flex flex-col gap-4',
          deviceInfo.screenSize >= ScreenSize['3XL'] ? 'max-w-full' : 'max-w-screen-lg',
        )}>
          <div id='top-levels-of-month' className='flex justify-center'>
            <Link
              className='font-bold text-xl text-center hover:underline'
              href={{
                pathname: '/search',
                query: {
                  sortBy: 'reviewScore',
                  timeRange: TimeRange[TimeRange.Month],
                },
              }}
            >
              Top Levels this Month
            </Link>
          </div>
          <div className='flex flex-wrap justify-center gap-4'>
            {topLevelsThisMonth ?
              topLevelsThisMonth.length === 0 ?
                <div className='text-center italic p-3'>No levels found</div>
                :
                topLevelsThisMonth.map((level) => {
                  return (
                    <LevelCard
                      id='top-level-this-month'
                      key={level._id.toString()}
                      level={level}
                    />
                  );
                })
              :
              <>
                <LoadingCard />
                <LoadingCard />
                <LoadingCard />
                <LoadingCard />
                <LoadingCard />
              </>
            }
          </div>
        </div>
        <div className='flex flex-col lg:flex-row items-center lg:items-start gap-8 w-full'>
          <div className='lg:w-7/12 h-min flex flex-col gap-4 max-w-full' id='latestLevelsSection'>
            <div id='latest-levels' className='flex justify-center'>
              <Link
                className='font-bold text-xl text-center hover:underline'
                href={{
                  pathname: '/search',
                  query: {
                    sortBy: 'ts',
                    statFilter: StatFilter.HideSolved,
                    timeRange: TimeRange[TimeRange.All],
                  },
                }}
              >
                Latest Unsolved Levels
              </Link>
            </div>
            <div className='flex flex-wrap justify-center gap-4'>
              {latestLevels ?
                latestLevels.length === 0 ?
                  <div className='text-center italic p-3'>No levels found</div>
                  :
                  latestLevels.map((level) => {
                    return (
                      <LevelCard
                        id='latest-unsolved'
                        key={level._id.toString()}
                        level={level}
                      />
                    );
                  })
                :
                <>
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                </>
              }
            </div>
          </div>
          <div id='latest-reviews' className='flex flex-col gap-4 lg:w-5/12 px-4 max-w-full'>
            <h2 className='font-bold text-xl text-center'>
              Latest Reviews
            </h2>
            <div className='w-full text-center flex flex-col gap-4'>
              {latestReviews === undefined ?
                <div className='flex justify-center p-4'>
                  <LoadingSpinner />
                </div>
                :
                latestReviews.length === 0 ?
                  <div className='text-center italic p-3'>No reviews found</div>
                  :
                  latestReviews.map(review => {
                    return (
                      <div key={`review-${review._id.toString()}`}>
                        <FormattedReview
                          level={review.levelId}
                          review={review}
                          user={review.userId}
                        />
                      </div>
                    );
                  })
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  </>);
}