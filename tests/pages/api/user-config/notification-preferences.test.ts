import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import NotificationType from '@root/constants/notificationType';
import { createNewFollowerNotification, createNewReviewOnYourLevelNotification } from '@root/helpers/notificationHelper';
import User from '@root/models/db/user';
import { processQueueMessages } from '@root/pages/api/internal-jobs/worker';
import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { EmailDigestSettingType } from '../../../../constants/emailDigest';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import UserConfig from '../../../../models/db/userConfig';
import { QueueMessageModel, UserConfigModel, UserModel } from '../../../../models/mongoose';
import handler from '../../../../pages/api/user-config/index';

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
const defaultObj = {
  method: 'PUT',
  headers: {
    'content-type': 'application/json',
  },
  cookies: {
    token: getTokenCookieValue(TestId.USER)
  }
};

const acceptMock = () => {
  return { rejected: [] };
};

const sendMailRefMock = { ref: acceptMock };

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockImplementation(() => ({
    sendMail: jest.fn().mockImplementation(() => {
      return sendMailRefMock.ref();
    }),
  })),
}));

describe('account settings notification preferences', () => {
  const disallowedEmailNotifications = [] as NotificationType[];
  const disallowedPushNotifications = [NotificationType.NEW_FOLLOWER];

  // enable all notifications
  test('enable all notifications except for new follower', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          body: {
            disallowedEmailNotifications: disallowedEmailNotifications,
            disallowedPushNotifications: disallowedPushNotifications,
            emailDigestSetting: EmailDigestSettingType.DAILY,
          }
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.updated).toBe(true);

        // check the db
        const user = await UserModel.findOne({ _id: TestId.USER }).lean<User>() as User;

        expect(user.disallowedEmailNotifications).toEqual(disallowedEmailNotifications);
        expect(user.disallowedPushNotifications).toEqual(disallowedPushNotifications);
      },
    });
  });
  test('create a new review on your level notification', async () => {
    // spy on sendMailRefMock.ref

    const originalSendEmail = jest.requireActual('@root/pages/api/internal-jobs/worker/sendEmailNotification');
    const originalSendPush = jest.requireActual('@root/pages/api/internal-jobs/worker/sendPushNotification');

    originalSendEmail.sendEmailNotification = jest.fn().mockImplementation(() => {
      // do nothing
    });
    originalSendPush.sendPushNotification = jest.fn().mockImplementation(() => {
      // do nothing
    });
    await createNewReviewOnYourLevelNotification(DEFAULT_GAME_ID, new Types.ObjectId(TestId.USER), new Types.ObjectId(TestId.USER_B), TestId.LEVEL, 'Sample review');

    const queueProcessed = await processQueueMessages();

    expect(queueProcessed).toBe('Processed 2 messages with no errors');
    expect(originalSendEmail.sendEmailNotification).toHaveBeenCalledTimes(1);
    expect(originalSendPush.sendPushNotification).toHaveBeenCalledTimes(1);
  });
  test('create a new follower notification', async () => {
    // spy on sendMailRefMock.ref

    const originalSendEmail = jest.requireActual('@root/pages/api/internal-jobs/worker/sendEmailNotification');
    const originalSendPush = jest.requireActual('@root/pages/api/internal-jobs/worker/sendPushNotification');

    originalSendEmail.sendEmailNotification = jest.fn().mockImplementation(() => {
      // do nothing
    });
    originalSendPush.sendPushNotification = jest.fn().mockImplementation(() => {
      // do nothing
    });
    await createNewFollowerNotification(DEFAULT_GAME_ID, TestId.USER_B, TestId.USER);

    const queueProcessed = await processQueueMessages();

    expect(queueProcessed).toBe('Processed 2 messages with no errors');
    expect(originalSendEmail.sendEmailNotification).toHaveBeenCalledTimes(1); // important
    expect(originalSendPush.sendPushNotification).toHaveBeenCalledTimes(0); // important!
  });
  test('create a new follow notification for a guest', async () => {
    // spy on sendMailRefMock.ref
    const b = await UserModel.findById(TestId.USER_GUEST);

    expect(b.disallowedEmailNotifications).toEqual([]);
    const originalSendEmail = jest.requireActual('@root/pages/api/internal-jobs/worker/sendEmailNotification');
    const originalSendPush = jest.requireActual('@root/pages/api/internal-jobs/worker/sendPushNotification');

    originalSendEmail.sendEmailNotification = jest.fn().mockImplementation(() => {
      // do nothing
    });
    originalSendPush.sendPushNotification = jest.fn().mockImplementation(() => {
      // do nothing
    });
    await createNewFollowerNotification(DEFAULT_GAME_ID, TestId.USER_B, TestId.USER_GUEST);

    const queueProcessed = await processQueueMessages();

    expect(queueProcessed).toBe('Processed 2 messages with 2 errors');
    const queueMessages = await QueueMessageModel.find({}).lean();

    expect(queueMessages.length).toBe(6);
    expect(queueMessages[4].log[0]).toContain('not sent: user is guest');
    expect(queueMessages[5].log[0]).toContain('not sent: user is guest');
    expect(originalSendEmail.sendEmailNotification).toHaveBeenCalledTimes(0); // important
    expect(originalSendPush.sendPushNotification).toHaveBeenCalledTimes(0); // important!
  });
});
