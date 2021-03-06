import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { ObjectId } from 'bson';
import { SentMessageInfo } from 'nodemailer';
import { UserModel } from '../../../../models/mongoose';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { enableFetchMocks } from 'jest-fetch-mock';
import getResetPasswordToken from '../../../../lib/getResetPasswordToken';
import resetPasswordHandler from '../../../../pages/api/reset-password/index';
import { testApiHandler } from 'next-test-api-route-handler';

const sendMailMock:jest.Mock = jest.fn((obj:SentMessageInfo)=>{
  throw new Error('Email was not expected to be sent, but received' + obj);

});

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockImplementation(() => ({
    sendMail: sendMailMock,
  })),
}));

afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();
const USER_ID_FOR_TESTING = '600000000000000000000000';
const differentUser = '600000000000000000000006';

describe('Reset a password API should function right', () => {
  test('Sending wrong HTTP method should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',

          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await resetPasswordHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      },
    });
  });

  test('Sending forgot a password request without parameters should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await resetPasswordHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Missing required parameters');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Sending forgot a password request with partial parameters should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
            email: 'blah@blah.com'
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await resetPasswordHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Missing required parameters');
        expect(res.status).toBe(400);
      },
    });
  });

  test('Sending forgot a password with an malformed token should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
            password: 'pass',
            userId: USER_ID_FOR_TESTING,
            token: 'blah'
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await resetPasswordHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Invalid token');
        expect(res.status).toBe(401);
      },
    });
  });
  test('Sending forgot a password with an invalid user should fail', async () => {
    const differentUserObj = await UserModel.findById(differentUser);

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
            password: 'pass',
            userId: new ObjectId(),
            token: getResetPasswordToken(differentUserObj)
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await resetPasswordHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Error finding User');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Sending forgot a password with a valid token for ANOTHER user token should fail', async () => {
    const differentUserObj = await UserModel.findById(differentUser);

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
            password: 'pass',
            userId: USER_ID_FOR_TESTING,
            token: getResetPasswordToken(differentUserObj)
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await resetPasswordHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Invalid token');
        expect(res.status).toBe(401);
      },
    });
  });
  test('Sending forgot a password with a valid token for my user token should work', async () => {
    const differentUserObj = await UserModel.findById(differentUser);

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
            password: 'NEWPASS',
            userId: differentUser,
            token: getResetPasswordToken(differentUserObj)
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await resetPasswordHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.success).toBe(true);

      },
    });
  });
  test('If my user does not have a timestamp, it should error with malformed token', async () => {
    const newUserId = new ObjectId();
    const newUserObj = await UserModel.create({
      _id: newUserId,
      calc_records: 0,
      email: 'bab@gmail.com',
      isOfficial: false,
      name: 'BLAH',
      password: 'BAAAB',
      score: 0,
      ts: null,
    });

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
            password: 'NEWPASS',
            userId: newUserId,
            token: getResetPasswordToken(newUserObj)
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await resetPasswordHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Malformed token');
        expect(res.status).toBe(401);
      },
    });
  });
});
