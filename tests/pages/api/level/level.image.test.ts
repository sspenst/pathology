import { NextApiRequest } from 'next';
import { ObjectId } from 'bson';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { enableFetchMocks } from 'jest-fetch-mock';
import getLevelImageHandler from '../../../../pages/api/level/image/[id]';
import { testApiHandler } from 'next-test-api-route-handler';

const USER_ID_FOR_TESTING = '600000000000000000000000';
const WORLD_ID_FOR_TESTING = '600000000000000000000001';
const LEVEL_ID_FOR_TESTING = '600000000000000000000002';

afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe('pages/api/level/image/[id]', () => {
  test('Now we should be able to get the level image', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequest = {
          method: 'GET',
          query: {
            id: LEVEL_ID_FOR_TESTING,
          },
        } as unknown as NextApiRequest;

        await getLevelImageHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(200);
        const body = await res.body.read();

        expect(body.length).toBeGreaterThan(1000);

      },
    });
  }, 30000);
  test('Requesting an image for a level that doesn\'t exist should 404', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequest = {
          method: 'GET',
          query: {
            id: new ObjectId(),
          },
        } as unknown as NextApiRequest;

        await getLevelImageHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(404);
        const response = await res.json();

        expect(response.error).toBe('Level not found');

      },
    });
  }, 30000);

});
