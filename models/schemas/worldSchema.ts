import { LevelModel, StatModel, WorldModel } from '../mongoose';

import Level from '../db/level';
import User from '../db/user';
import World from '../db/world';
import mongoose from 'mongoose';

const WorldSchema = new mongoose.Schema<World>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  authorNote: {
    type: String,
    maxlength: 1024 * 5, // 5 kb limit seems reasonable
  },
  levels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Level',
  }],
  name: {
    type: String,
    minlength: 1,
    maxlength: 50,
    required: true,
  },
  psychopathId: {
    type: Number,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  collation: {
    locale: 'en_US',
    strength: 2,
  },
});

export async function getFirstLevelInWorldNotBeatenByUser(world: World, user: User) {
  const [levels, levelIdsUserHasBeaten] = await Promise.all([
    await WorldModel.findById(world._id).populate('levels'),
    await StatModel.find({ userId: user._id, complete: true }, { levelId: 1 })
  ]);

  // filter out levels the user has beaten
  const levelsUserHasNotBeaten = levels.filter((level:Level) => !levelIdsUserHasBeaten.some(levelId => levelId.levelId.equals(level._id)));

  return levelsUserHasNotBeaten[0] || null;
}

WorldSchema.pre('updateOne', function (next) {
  this.options.runValidators = true;

  return next();
});

export default WorldSchema;
