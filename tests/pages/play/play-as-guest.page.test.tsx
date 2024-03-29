import { GameId } from '@root/constants/GameId';
import { Types } from 'mongoose';
import { GetServerSidePropsContext } from 'next';
import TestId from '../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../lib/getTokenCookie';
import { CampaignModel } from '../../../models/mongoose';
import { getServerSideProps } from '../../../pages/[subdomain]/play-as-guest';

beforeAll(async () => {
  await dbConnect();
  await CampaignModel.create({
    _id: new Types.ObjectId(),
    collections: [new Types.ObjectId(TestId.COLLECTION)],
    gameId: GameId.PATHOLOGY,
    name: 'Pathology',
    slug: 'pathology',
  });
});
afterAll(async () => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('pages/play page', () => {
  test('getServerSideProps not logged in', async () => {
    // Created from initialize db file
    const context = {

    };
    const ret = await getServerSideProps(context as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.props).toHaveProperty('recaptchaPublicKey');
  });
  test('getServerSideProps logged in', async () => {
    // Created from initialize db file
    const context = {
      req: {
        cookies: {
          token: getTokenCookieValue(TestId.USER)
        }
      },
    };
    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret).toBeDefined();
    expect(ret.redirect).toBeDefined();
  });
});
