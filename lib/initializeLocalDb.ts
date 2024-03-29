import { EmailDigestSettingType } from '@root/constants/emailDigest';
import { PASSWORD_SALTROUNDS } from '@root/constants/passwordSaltRounds';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import User from '@root/models/db/user';
import UserConfig from '@root/models/db/userConfig';
import { AttemptContext } from '@root/models/schemas/playAttemptSchema';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { DEFAULT_GAME_ID, GameId } from '../constants/GameId';
import Role from '../constants/role';
import TestId from '../constants/testId';
import { generateCollectionSlug, generateLevelSlug } from '../helpers/generateSlug';
import { TimerUtil } from '../helpers/getTs';
import Collection from '../models/db/collection';
import Level from '../models/db/level';
import { CampaignModel, CollectionModel, LevelModel, PlayAttemptModel, RecordModel, ReviewModel, StatModel, UserConfigModel, UserModel } from '../models/mongoose';

function getNewUserConfig(gameId: GameId, tutorialCompletedAt: number, userId: Types.ObjectId, params?: Partial<UserConfig>) {
  return {
    gameId: gameId,
    theme: getGameFromId(gameId).defaultTheme,
    tutorialCompletedAt: tutorialCompletedAt,
    userId: userId,
    ...params,
  } as Partial<UserConfig>;
}

export async function genTestUser(props?: Partial<User>) {
  const ts = TimerUtil.getTs();

  return {
    email: 'test' + (Math.random() * 1000000).toFixed(0) + '@gmail.com',
    name: 'test' + (Math.random() * 1000000).toFixed(0),
    emailConfirmed: true,
    ts: ts,
    last_visited_at: ts,
    password: await bcrypt.hash('test1234', PASSWORD_SALTROUNDS),
    ...props
  };
}

export function genTestLevel(props?: Partial<Level>) {
  const ts = TimerUtil.getTs();

  return {
    _id: new Types.ObjectId(TestId.LEVEL),
    authorNote: 'test level 1 author note',
    data: '4000B0\n120000\n050000\n678900\nABCD30',
    gameId: DEFAULT_GAME_ID,
    height: 5,
    isDraft: false,
    isRanked: false,
    leastMoves: 20,
    name: 'test level 1',
    slug: 'test/test-level-1',
    ts: ts,
    userId: new Types.ObjectId(TestId.USER),
    width: 6,
    ...props
  };
}

export default async function initializeLocalDb() {
  const ts = TimerUtil.getTs() - 60;

  // USER
  const promises = [];

  // Note - UserModel has to use create, not insertMany, because of the pre-save hook for the password
  promises.push(UserModel.insertMany([
    {
      _id: new Types.ObjectId(TestId.USER),
      email: 'test@gmail.com',
      emailConfirmed: true,
      last_visited_at: ts,
      name: 'test',
      password: await bcrypt.hash('test1234', PASSWORD_SALTROUNDS),
      ts: ts,
    },
    {
      _id: new Types.ObjectId(TestId.USER_B),
      email: 'bbb@gmail.com',
      emailConfirmed: true,
      name: 'BBB',
      password: await bcrypt.hash('BBB12345', PASSWORD_SALTROUNDS),
      ts: ts,
    },
    {
      _id: new Types.ObjectId(TestId.USER_C),
      email: 'the_curator@gmail.com',
      emailConfirmed: true,
      name: 'Curator',
      password: await bcrypt.hash('Curator1', PASSWORD_SALTROUNDS),
      roles: [Role.CURATOR],
      ts: ts,
    },
    {
      _id: new Types.ObjectId(TestId.USER_D),
      //calc_records: 1,
      email: 'someolduser@someolduser.com',
      emailConfirmed: false,
      name: 'AncientUser',
      password: await bcrypt.hash('ancient1', PASSWORD_SALTROUNDS),
      roles: [],
      // no ts
    },
    {
      _id: new Types.ObjectId(TestId.USER_GUEST),
      email: 'guest@guest.com',
      emailConfirmed: true,
      name: 'guest',
      password: await bcrypt.hash('BBB12345', PASSWORD_SALTROUNDS),
      roles: [Role.GUEST],
      ts: ts,
    },
    {
      _id: new Types.ObjectId(TestId.USER_PRO),
      email: 'pro@pro.com',
      emailConfirmed: true,
      name: 'Pro',
      password: await bcrypt.hash('pro', PASSWORD_SALTROUNDS),
      emailDigest: EmailDigestSettingType.NONE,
      stripeCustomerId: 'cus_123',
      ts: ts,
    },
    {
      _id: new Types.ObjectId(TestId.USER_ADMIN),
      email: 'admin@admin.com',
      emailConfirmed: true,
      name: 'Admin',
      password: await bcrypt.hash('admin', PASSWORD_SALTROUNDS),
      roles: [Role.ADMIN],
      ts: ts,
    },
  ],
  { ordered: false }
  ));

  promises.push(UserConfigModel.insertMany([
    getNewUserConfig(DEFAULT_GAME_ID, 0, new Types.ObjectId(TestId.USER), {
      calcLevelsCompletedCount: 2,
      calcLevelsSolvedCount: 2,
      calcRecordsCount: 2,
    }),

    getNewUserConfig(DEFAULT_GAME_ID, 0, new Types.ObjectId(TestId.USER_B), {
      calcRecordsCount: 0,

    }),
    getNewUserConfig(DEFAULT_GAME_ID, 0, new Types.ObjectId(TestId.USER_C), {
      calcLevelsCompletedCount: 1,
      calcLevelsSolvedCount: 1,
      calcRecordsCount: 1,
    }),
    getNewUserConfig(DEFAULT_GAME_ID, 0, new Types.ObjectId(TestId.USER_GUEST), {
      calcRecordsCount: 0,
    }),
    getNewUserConfig(DEFAULT_GAME_ID, 0, new Types.ObjectId(TestId.USER_PRO), {
      calcRecordsCount: 1,
      roles: [Role.PRO],
    }),

  ], { ordered: false }));

  // LEVEL
  promises.push(LevelModel.insertMany(
    [
      {
        _id: new Types.ObjectId(TestId.LEVEL),
        authorNote: 'test level 1 author note',
        data: '4000B0\n120000\n050000\n678900\nABCD30',
        gameId: DEFAULT_GAME_ID,
        height: 5,
        isDraft: false,
        isRanked: false,
        leastMoves: 20,
        name: 'test level 1',
        slug: 'test/test-level-1',
        ts: ts,
        userId: new Types.ObjectId(TestId.USER),
        width: 6,
      },
      {
        _id: new Types.ObjectId(TestId.LEVEL_2),
        data: '40000\n12000\n05000\n67890\nABC03',
        gameId: DEFAULT_GAME_ID,
        height: 5,
        isDraft: true,
        isRanked: false,
        leastMoves: 20,
        name: 'test level 2',
        slug: 'test/test-level-2',
        ts: ts,
        userId: new Types.ObjectId(TestId.USER),
        width: 5,
      },
      {
        _id: new Types.ObjectId(TestId.LEVEL_3),
        data: '40\n03',
        gameId: DEFAULT_GAME_ID,
        height: 2,
        isDraft: false,
        isRanked: false,
        leastMoves: 80,
        name: 'x',
        slug: 'test/x',
        ts: ts,
        userId: new Types.ObjectId(TestId.USER),
        width: 2,
      },
      {
        _id: new Types.ObjectId(TestId.LEVEL_4),
        data: '40000\n02000\n05000\n67890\nABCD3',
        gameId: DEFAULT_GAME_ID,
        height: 5,
        isDraft: false,
        isRanked: false,
        leastMoves: 20,
        name: 'y',
        slug: 'bbb/y',
        ts: ts,
        userId: new Types.ObjectId(TestId.USER_B),
        width: 5,
      },
      {
        _id: new Types.ObjectId(TestId.LEVEL_DELETED),
        authorNote: 'test level deleted author note',
        data: '4000B0\n120000\n050000\n678900\nABCD30',
        gameId: DEFAULT_GAME_ID,
        height: 5,
        isDeleted: true,
        isDraft: false,
        isRanked: false,
        leastMoves: 20,
        name: 'test level deleted',
        slug: TestId.LEVEL_DELETED,
        ts: ts,
        userId: new Types.ObjectId(TestId.USER),
        width: 6,
      }
    ],
    { ordered: false }
  ));
  promises.push(RecordModel.insertMany(
    [
      {
        _id: new Types.ObjectId(TestId.RECORD),
        gameId: DEFAULT_GAME_ID,
        levelId: new Types.ObjectId(TestId.LEVEL),
        moves: 20,
        ts: ts,
        userId: new Types.ObjectId(TestId.USER),
      },
      {
        _id: new Types.ObjectId(),
        gameId: DEFAULT_GAME_ID,
        levelId: new Types.ObjectId(TestId.LEVEL_3),
        moves: 80,
        ts: ts,
        userId: new Types.ObjectId(TestId.USER),
      },
      {
        _id: new Types.ObjectId(),
        gameId: DEFAULT_GAME_ID,
        levelId: new Types.ObjectId(TestId.LEVEL_3),
        moves: 20,
        ts: ts,
        userId: new Types.ObjectId(TestId.USER_B),
      },
      {
        _id: new Types.ObjectId(),
        gameId: DEFAULT_GAME_ID,
        isDeleted: true,
        levelId: new Types.ObjectId(TestId.LEVEL_DELETED),
        moves: 20,
        ts: ts,
        userId: new Types.ObjectId(TestId.USER),
      }
    ],
    {
      ordered: false
    }
  ));
  promises.push(StatModel.insertMany(
    [
      {
        _id: new Types.ObjectId(),
        attempts: 1,
        complete: true,
        gameId: DEFAULT_GAME_ID,
        levelId: new Types.ObjectId(TestId.LEVEL),
        moves: 20,
        ts: ts,
        userId: new Types.ObjectId(TestId.USER),
      },
      {
        _id: new Types.ObjectId(),
        attempts: 1,
        complete: false,
        gameId: DEFAULT_GAME_ID,
        levelId: new Types.ObjectId(TestId.LEVEL),
        moves: 22,
        ts: ts,
        userId: new Types.ObjectId(TestId.USER_B),
      },
      {
        _id: new Types.ObjectId(),
        attempts: 1,
        complete: true,
        gameId: DEFAULT_GAME_ID,
        levelId: new Types.ObjectId(TestId.LEVEL_3),
        moves: 80,
        ts: ts,
        userId: new Types.ObjectId(TestId.USER),
      },
      {
        _id: new Types.ObjectId(),
        attempts: 1,
        complete: true,
        gameId: DEFAULT_GAME_ID,
        levelId: new Types.ObjectId(TestId.LEVEL_4),
        moves: 20,
        ts: ts,
        userId: new Types.ObjectId(TestId.USER_B),
      },
      {
        _id: new Types.ObjectId(),
        attempts: 1,
        complete: true,
        gameId: DEFAULT_GAME_ID,
        isDeleted: true,
        levelId: new Types.ObjectId(TestId.LEVEL_DELETED),
        moves: 20,
        ts: ts,
        userId: new Types.ObjectId(TestId.USER),
      }
    ],
    {
      ordered: false
    }
  ));

  // DELETED DOCUMENTS

  promises.push(PlayAttemptModel.insertMany([
    {
      _id: new Types.ObjectId(),
      attemptContext: AttemptContext.UNSOLVED,
      endTime: 200,
      gameId: DEFAULT_GAME_ID,
      isDeleted: true,
      levelId: new Types.ObjectId(TestId.LEVEL_DELETED),
      startTime: 100,
      updateCount: 1,
      userId: new Types.ObjectId(TestId.USER),
    }
  ],
  { ordered: false }
  ));

  promises.push(ReviewModel.insertMany(
    [
      {
        _id: new Types.ObjectId(),
        gameId: DEFAULT_GAME_ID,
        isDeleted: true,
        levelId: new Types.ObjectId(TestId.LEVEL_DELETED),
        score: 5,
        text: 'My best creation. I can\'t really imagine anything better.',
        ts: ts,
        userId: new Types.ObjectId(TestId.USER_B),
      },
      {
        _id: new Types.ObjectId(TestId.REVIEW),
        gameId: DEFAULT_GAME_ID,
        levelId: new Types.ObjectId(TestId.LEVEL),
        score: 5,
        text: 'My best creation. I can\'t really imagine anything better.',
        ts: ts,
        userId: new Types.ObjectId(TestId.USER_B),
      }
    ],
    { ordered: false }
  ));

  promises.push(CollectionModel.insertMany(
    [
      {
        _id: new Types.ObjectId(TestId.COLLECTION),
        authorNote: 'test collection author note',
        gameId: DEFAULT_GAME_ID,
        levels: [new Types.ObjectId(TestId.LEVEL), new Types.ObjectId(TestId.LEVEL_2)],
        name: 'test collection',
        slug: 'test/test-collection',
        userId: new Types.ObjectId(TestId.USER),
      },
      {
        _id: new Types.ObjectId(TestId.COLLECTION_2),
        gameId: DEFAULT_GAME_ID,
        levels: [new Types.ObjectId(TestId.LEVEL), new Types.ObjectId(TestId.LEVEL_2), new Types.ObjectId(TestId.LEVEL_3)],
        name: 'test collection 2',
        slug: 'test/test-collection-2',
        userId: new Types.ObjectId(TestId.USER),
      },
      {
        _id: new Types.ObjectId(TestId.COLLECTION_B),
        gameId: DEFAULT_GAME_ID,
        isPrivate: true,
        levels: [new Types.ObjectId(TestId.LEVEL), new Types.ObjectId(TestId.LEVEL_2), new Types.ObjectId(TestId.LEVEL_3)],
        name: 'test collection 3',
        slug: 'bbb/test-collection',
        userId: new Types.ObjectId(TestId.USER_B),
      },
    ],
    { ordered: false }
  ));

  promises.push(CampaignModel.insertMany(
    [
      {
        _id: new Types.ObjectId(TestId.CAMPAIGN_OFFICIAL),
        authorNote: 'The official campaign!',
        collections: [new Types.ObjectId(TestId.COLLECTION)],
        gameId: DEFAULT_GAME_ID,
        name: 'Official Campaign',
        slug: 'official-campaign',
      }
    ]));

  await Promise.all(promises);
}

export async function initLevel(gameId: GameId, userId: string, name: string, obj: Partial<Level> = {}, createReviews = true) {
  const ts = TimerUtil.getTs();
  const id = new Types.ObjectId();
  const user = await UserModel.findById(userId, 'name');
  const slug = await generateLevelSlug(gameId, user.name, name);

  // based on name length create that many reviews
  const lvl = await LevelModel.create({
    _id: id,
    authorNote: 'test level ' + name + ' author note',
    data: '40000\n12000\n05000\n67890\nABCD3',
    gameId: DEFAULT_GAME_ID,
    height: 5,
    isDraft: false,
    isRanked: false,
    leastMoves: 20,
    name: name,
    slug: slug,
    ts: ts - name.length * 300,
    userId: userId,
    width: 5,
    ...obj }) as Level;

  if (createReviews) {
    const revs = [];

    for (let i = 0; i < name.length; i++) {
      revs.push({
        _id: new Types.ObjectId(),
        gameId: DEFAULT_GAME_ID,
        levelId: id,
        score: (3903 * i * i + 33 * i) % 5 + 1,
        text: 'Game is OK',
        ts: ts - i * 20,
        userId: new Types.ObjectId(),
      });
    }

    await ReviewModel.insertMany(revs);
  }

  return lvl;
}

export async function initCollection(userId: string, name: string, obj: Partial<Collection> = {}) {
  const id = new Types.ObjectId();
  const collection = await CollectionModel.create({
    _id: id,
    authorNote: 'test collection ' + name + ' author note',
    gameId: DEFAULT_GAME_ID,
    name: name,
    userId: userId,
    slug: await generateCollectionSlug(DEFAULT_GAME_ID, 'test', name),
    ...obj }) as Collection;

  return collection;
}
