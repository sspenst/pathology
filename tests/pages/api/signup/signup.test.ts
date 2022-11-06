import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import { SentMessageInfo } from 'nodemailer';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { UserModel } from '../../../../models/mongoose';
import loginUserHandler from '../../../../pages/api/login/index';
import signupUserHandler from '../../../../pages/api/signup/index';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async() => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
enableFetchMocks();

const acceptMock = () => {
  return { rejected: [] };};

const sendMailRefMock = { ref: acceptMock };

afterEach(() => {
  jest.restoreAllMocks();
});

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockImplementation(() => ({
    sendMail: jest.fn().mockImplementation(() => {
      return sendMailRefMock.ref();
    }),
  })),
}));

describe('pages/api/collection/index.ts', () => {
  const cookie = getTokenCookieValue(TestId.USER);

  test('Signup on non POST endpoint', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: cookie,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await signupUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      },
    });
  });
  test('Creating a user without a body should fail with 400', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: cookie,
          },

          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await signupUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Bad request');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Creating a user with missing parameters should fail', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: cookie,
          },
          body: {
            name: 'test',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await signupUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Invalid body.email, body.password');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Creating a user with existing email should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: cookie,
          },
          body: {
            name: 'test_new',
            email: 'test@gmail.com',
            password: 'password',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await signupUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(401);
        expect(response.error).toBe('Email already exists');
      },
    });
  });
  test('Creating a user with existing username should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: cookie,
          },
          body: {
            name: 'test',
            email: 'test@test.com',
            password: 'password',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await signupUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(401);
        expect(response.error).toBe('Username already exists');
      },
    });
  });
  test('Creating a user with existing email should fail but send email', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: cookie,
          },
          body: {
            name: 'testblah',
            email: 'someolduser@someolduser.com',
            password: 'password',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await signupUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(400);
        expect(response.error).toBe('We tried emailing you a reset password link. If you still have problems please contact Pathology devs via Discord.');
      },
    });
  });
  test('Creating a user with bonkers name should NOT work (and return a 500 due to validation failure)', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    // Suppress logger errors for this test
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: cookie,
          },
          body: {
            name: 'Space Space',
            email: 'test5@test.com',
            password: 'password2',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await signupUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(500);
      },
    });
  });
  test('Creating a user with valid parameters should work', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: cookie,
          },
          body: {
            name: 'Test2',
            email: 'test2@test.com',
            password: 'password2',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await signupUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(200);
        const db = await UserModel.findOne({ email: 'test2@test.com' });

        expect(db).toBeDefined();
        expect(db.name).toBe('Test2');
        expect(db.password).not.toBe('password2'); // should be salted
      },
    });
  });
  test('We should be able to login with the newly created user', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
            name: 'test2',
            password: 'password2'
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await loginUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.success).toBeDefined();
      },
    });
  });
  test('We should be able to login with if spaces are around the user name', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
            name: '  test2  ',
            password: 'password2'
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await loginUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.success).toBeDefined();
      },
    });
  });
});
