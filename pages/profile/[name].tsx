import classNames from 'classnames';
import { GetServerSidePropsContext } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import React, { useState } from 'react';
import { SWRConfig } from 'swr';
import Avatar from '../../components/avatar';
import FormattedReview from '../../components/formattedReview';
import Page from '../../components/page';
import SkeletonPage from '../../components/skeletonPage';
import Dimensions from '../../constants/dimensions';
import getFormattedDate from '../../helpers/getFormattedDate';
import getSWRKey from '../../helpers/getSWRKey';
import useReviewsByUserId from '../../hooks/useReviewsByUserId';
import useReviewsForUserId from '../../hooks/useReviewsForUserId';
import useUserById from '../../hooks/useUserById';
import cleanUser from '../../lib/cleanUser';
import dbConnect from '../../lib/dbConnect';
import Review from '../../models/db/review';
import User from '../../models/db/user';
import { UserModel } from '../../models/mongoose';
import { getReviewsByUserId } from '../api/reviews-by-user-id/[id]';
import { getReviewsForUserId } from '../api/reviews-for-user-id/[id]';
import styles from './ProfilePage.module.css';

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: true,
  };
}

interface ProfileParams extends ParsedUrlQuery {
  name: string;
}

export async function getStaticProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const { name } = context.params as ProfileParams;
  const user = await UserModel.findOne({ name: name }, '-email -password', { lean: true });

  if (!user) {
    return {
      user: undefined,
    };
  }

  cleanUser(user);

  const userId = user._id.toString();
  const [reviewsReceived, reviewsWritten] = await Promise.all([
    getReviewsForUserId(userId),
    getReviewsByUserId(userId),
  ]);

  return {
    props: {
      reviewsReceived: JSON.parse(JSON.stringify(reviewsReceived)),
      reviewsWritten: JSON.parse(JSON.stringify(reviewsWritten)),
      user: JSON.parse(JSON.stringify(user)),
    } as ProfileProps,
    revalidate: 60 * 60,
  };
}

interface ProfileProps {
  reviewsReceived: Review[];
  reviewsWritten: Review[];
  user: User | undefined;
}

/* istanbul ignore next */
export default function Profile({ reviewsReceived, reviewsWritten, user }: ProfileProps) {
  const router = useRouter();
  const { name } = router.query;

  if (router.isFallback || !name) {
    return <SkeletonPage />;
  }

  if (!user) {
    return <SkeletonPage text={'User not found'} />;
  }

  const userId = user._id.toString();

  return (
    <SWRConfig value={{ fallback: {
      [getSWRKey(`/api/reviews-for-user-id/${userId}`)]: reviewsReceived,
      [getSWRKey(`/api/reviews-by-user-id/${userId}`)]: reviewsWritten,
      [getSWRKey(`/api/user-by-id/${userId}`)]: user,
    } }}>
      <ProfilePage id={userId} />
    </SWRConfig>
  );
}

interface ProfilePageProps {
  id: string;
}

function ProfilePage({ id }: ProfilePageProps) {
  const { reviews } = useReviewsByUserId(id);
  const { reviewsForUserId } = useReviewsForUserId(id);
  const [tab, setTab] = useState('profile-tab');
  const { user } = useUserById(id);

  if (user === null) {
    return <span>User not found!</span>;
  } else if (!user) {
    return <span>Loading...</span>;
  }

  const changeTab = (buttonElement: React.MouseEvent<HTMLButtonElement>) => {
    setTab(buttonElement.currentTarget.id);
  };

  // create an array of objects with the id, trigger element (eg. button), and the content element
  const tabsContent = {
    'profile-tab': (user.ts ?
      <>
        <div className='flex items-center justify-center mb-4'>
          <Avatar size={Dimensions.AvatarSizeLarge} user={user} />
        </div>
        <span>{`Account created: ${getFormattedDate(user.ts)}`}</span>
        <br />
        {!user.hideStatus && <>
          <span>{`Last seen: ${getFormattedDate(user.last_visited_at ? user.last_visited_at : user.ts)}`}</span>
          <br />
        </>}
        <span>{`${user.name} has completed ${user.score} level${user.score !== 1 ? 's' : ''}`}</span>
      </>
      : null
    ),
    'reviews-written-tab': [
      reviews && reviews.length > 0 ?
        <h1 key='reviews-written-tab' className='text-lg'>
          {`${user.name}'s reviews (${reviews.length}):`}
        </h1> : null,

      reviews?.map(review => {
        return (
          <div
            key={`review-${review._id}`}
            style={{
              margin: 20,
            }}
          >
            <FormattedReview
              level={review.levelId}
              review={review}
            />
          </div>
        );
      })
    ],
    'reviews-received-tab': [
      reviewsForUserId && reviewsForUserId.length > 0 ?
        <h1 key='reviews-received-tab' className='text-lg'>
          Reviews for {`${user.name}'s levels (${reviewsForUserId.length}):`}
        </h1> : null,

      reviewsForUserId?.map(review => {
        return (
          <div
            key={`review-${review._id}`}
            style={{
              margin: 20,
            }}
          >
            <FormattedReview
              level={review.levelId}
              review={review}
              user={review.userId}
            />
          </div>
        );
      })
    ],
  } as { [key: string]: React.ReactNode | null };

  function getTabClassNames(tabId: string) {
    return classNames('inline-block p-2 rounded-t-lg', tab == tabId ? styles['tab-active'] : styles.tab);
  }

  return (
    <Page title={`${user.name}'s profile`}>
      <div className='items-center'>
        <div
          className='flex flex-wrap text-sm text-center border-b'
          style={{
            borderColor: 'var(--bg-color-3)',
          }}
        >
          <button
            aria-current='page'
            className={getTabClassNames('profile-tab')}
            id='profile-tab'
            onClick={changeTab}
          >
            Profile
          </button>
          <button
            className={getTabClassNames('reviews-written-tab')}
            id='reviews-written-tab'
            onClick={changeTab}
          >
            Reviews Written ({reviews?.length || 0})
          </button>
          <button
            className={getTabClassNames('reviews-received-tab')}
            id='reviews-received-tab'
            onClick={changeTab}
          >
            Reviews Received ({reviewsForUserId?.length || 0})
          </button>
          <Link href={`/universe/${user._id}`} passHref>
            <a className={getTabClassNames('levels-tab')}>
              Levels
            </a>
          </Link>
        </div>
        <div className='tab-content text-center'>
          <div className='p-4' id='content' role='tabpanel' aria-labelledby='tabs-home-tabFill'>
            {tabsContent[tab]}
          </div>
        </div>
      </div>
    </Page>
  );
}
