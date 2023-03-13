import { Types } from 'mongoose';
import TestId from '../../constants/testId';
import filterSelectOptions, { FilterSelectOption } from '../../helpers/filterSelectOptions';
import getDifficultyEstimate from '../../helpers/getDifficultyEstimate';
import getFormattedDate from '../../helpers/getFormattedDate';
import getProfileSlug from '../../helpers/getProfileSlug';
import getSWRKey from '../../helpers/getSWRKey';
import { TimerUtil } from '../../helpers/getTs';
import getUserStats from '../../helpers/getUserStats';
import isOnline from '../../helpers/isOnline';
import naturalSort from '../../helpers/naturalSort';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';
import Level from '../../models/db/level';
import Stat from '../../models/db/stat';
import User from '../../models/db/user';
import { UserModel } from '../../models/mongoose';
import SelectOption from '../../models/selectOption';
import SelectOptionStats from '../../models/selectOptionStats';
import { UserWithLevels } from '../../pages/catalog/[[...route]]';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
describe('helpers/*.ts', () => {
  test('getUserStats', async () => {
    const levelId = new Types.ObjectId();
    const stats = [
      {
        complete: true,
        levelId: levelId,
      },
    ] as Stat[];
    const usersWithLevels = [
      {
        levels: [levelId],
      },
      {
        levels: [new Types.ObjectId()],
      },
      {
        levels: undefined,
      },
    ] as UserWithLevels[];

    let userStats = getUserStats(undefined, usersWithLevels);

    expect(userStats.length).toBe(3);
    expect(userStats[0].userTotal).toBeUndefined();

    userStats = getUserStats(stats, usersWithLevels);

    expect(userStats.length).toBe(3);
    expect(userStats[0].userTotal).toBe(1);
    expect(userStats[1].userTotal).toBe(0);
    expect(userStats[2].total).toBe(0);
    expect(userStats[2].userTotal).toBe(0);
  });
  test('getFormattedDate', async () => {
    // create a date for two days in the past
    const date = new Date();

    // subtract a bit more than 2 days to account for time change (this actually caused the test to fail after daylight saving time)
    date.setDate(date.getDate() - 2.5);
    const formattedDate = getFormattedDate(date.getTime() / 1000);

    expect(formattedDate).toBe('2 days ago');
  });
  test('naturalSort', async () => {
    const obj = [
      {
        name: '1. a',
      },
      {
        name: '2. b',
      },
      {
        name: '10. c',
      },
      {
        name: '3. d',
      },
    ];
    const sorted = naturalSort(obj);

    expect(sorted[0].name).toBe('1. a');
    expect(sorted[1].name).toBe('2. b');
    expect(sorted[2].name).toBe('3. d');
    expect(sorted[3].name).toBe('10. c');
  });
  test('getProfileSlug', async () => {
    const user = await UserModel.findById(TestId.USER);
    const slug = getProfileSlug(user);

    expect(slug).toBe('/profile/test');
  });
  test('isOnline', async () => {
    const user = await UserModel.findOneAndUpdate({ _id: TestId.USER },
      {
        $set:
        {
          last_visited_at: TimerUtil.getTs() - 5 * 60 * 2
        },
      }
    ) as User;

    expect(isOnline(user)).toBe(true);
    user.last_visited_at = TimerUtil.getTs() - 5 * 60 * 2;

    expect(isOnline(user)).toBe(false);
    user.last_visited_at = undefined;
    expect(isOnline(user)).toBe(false);
  });
  test('getSWRKey', () => {
    const key = getSWRKey('/api/asdf');

    expect(key).toBe('@"/api/asdf",undefined,');
  });
  test('filterSelectOptions', () => {
    const selectOptions = [
      {
        stats: new SelectOptionStats(7, 7),
        text: 'complete',
      },
      {
        stats: new SelectOptionStats(9, 1),
        text: 'in progress',
      },
      {
        stats: new SelectOptionStats(5, 0),
      },
      {
        text: 'empty',
      },
      {
        stats: new SelectOptionStats(10, undefined),
        text: 'no user total',
      },
    ] as SelectOption[];

    let options = filterSelectOptions(selectOptions, FilterSelectOption.All, '');

    expect(options.length).toBe(5);

    options = filterSelectOptions(selectOptions, FilterSelectOption.HideWon, '');

    expect(options.length).toBe(3);
    expect(options[0].text).toBe('in progress');

    options = filterSelectOptions(selectOptions, FilterSelectOption.ShowInProgress, '');

    expect(options.length).toBe(1);
    expect(options[0].text).toBe('in progress');

    options = filterSelectOptions(selectOptions, FilterSelectOption.All, 'complete');

    expect(options.length).toBe(1);
    expect(options[0].text).toBe('complete');
  });
  test('getDifficultyEstimate', async () => {
    const level = {
      calc_playattempts_duration_sum: 800,
      calc_playattempts_just_beaten_count: 1,
    } as Partial<Level>;

    expect(getDifficultyEstimate(level, 8)).toBe(-1);
    expect(getDifficultyEstimate(level, 10)).toBeCloseTo(800 * 1.48906);

    level.calc_playattempts_just_beaten_count = 0;

    expect(getDifficultyEstimate(level, 8)).toBe(-1);
    expect(getDifficultyEstimate(level, 10)).toBeCloseTo(800 * 1.48906);

    level.calc_playattempts_duration_sum = 0;

    expect(getDifficultyEstimate(level, 10)).toBe(0);
  });
});

export {};
