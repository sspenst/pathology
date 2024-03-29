import { NextApiRequestWrapper } from '@root/helpers/apiWrapper';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import handler from '../../../../pages/api/logout/index';

afterAll(async() => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
beforeAll(async () => {
  await dbConnect();
});
enableFetchMocks();
describe('Testing logout api', () => {
  jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

  test('Sending correct data should return 200', async () => {
    const credsJSON = { name: 'test', password: 'test' };

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req = {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'host': 'localhost:3000'
          },
          body: JSON.stringify(credsJSON)
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.success).toBe(true);
        expect(res.status).toBe(200);
      }
    });
  });
});
