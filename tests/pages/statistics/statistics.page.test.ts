import { GetServerSidePropsContext } from 'next';
import dbConnect, { dbDisconnect } from '../../../lib/dbConnect';
import Statistics from '../../../models/statistics';
import { getStaticPaths, getStaticProps } from '../../../pages/statistics/index';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
//enableFetchMocks()

describe('pages/statistics page', () => {
  test('getStaticProps not logged in and with no params', async () => {
    // Created from initialize db file
    const retStatic = await getStaticPaths();

    expect(retStatic).toEqual({
      paths: [],
      fallback: true,
    });
    const retNotFound = await getStaticProps({
      params: {
        route: ['should-not-exist']
      }

    } as unknown as GetServerSidePropsContext);

    expect(retNotFound).toEqual({
      notFound: true,
    });
    const ret = await getStaticProps({} as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.props?.statistics).toBeDefined();
    const stats: Statistics = (ret.props?.statistics as Statistics);

    expect(stats.currentlyOnlineCount).toBe(1);
    expect(stats.newUsers).toHaveLength(4);
    expect(stats.registeredUsersCount).toBe(3);
    expect(stats.topRecordBreakers).toHaveLength(2);
    expect(stats.topReviewers).toHaveLength(1);
    expect(stats.topScorers).toHaveLength(2);
    expect(stats.totalAttempts).toBe(3);
  }
  );
  test('getStaticProps get null from getStatistics', async () => {
    // Created from initialize db file
    const mock = jest.requireActual('../../../pages/api/statistics');

    jest.spyOn(mock, 'getStatistics').mockImplementation(() => {
      return null;
    });
    await expect(() => getStaticProps({} as GetServerSidePropsContext)).rejects.toThrow('Error finding statistics');
  }
  );
});
