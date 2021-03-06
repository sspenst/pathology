import { LevelModel } from '../mongoose';
import bcrypt from 'bcrypt';
import generateSlug from '../../helpers/generateSlug';
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  calc_records: {
    type: Number,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 50,
  },
  isOfficial: {
    type: Boolean,
    required: true,
  },
  last_visited_at: {
    type: Number,
  },
  name: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 50,
  },
  password: {
    type: String,
    required: true,
  },
  psychopathId: {
    type: Number,
  },
  score: {
    type: Number,
    required: true,
  },
  ts: {
    type: Number,
  },
}, {
  collation: {
    locale: 'en_US',
    strength: 2,
  },
});

UserSchema.pre('updateOne', function(next) {
  this.options.runValidators = true;

  // if name has changed then call save on every level belonging to the user
  if (this.getUpdate().$set?.name) {
    LevelModel.find({
      userId: this._conditions._id,
    }, {})
      .then(async (levels) => {
        await Promise.all(levels.map(async (level) => {
          level.slug = await generateSlug(level._id, this.getUpdate().$set.name, level.name);
          level.save();
        }));
        next();
      })
      .catch((err) => {
        console.trace(err);
        next(err);
      });
  } else {
    next();
  }
});

const saltRounds = 10;

UserSchema.pre('save', function(next) {
  // Check if document is new or a new password has been set
  if (this.isNew || this.isModified('password')) {
    // Saving reference to this because of changing scopes
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const document = this;

    bcrypt.hash(document.password, saltRounds,
      function(err, hashedPassword) {
        if (err) {
          next(err);
        } else {
          document.password = hashedPassword;
          next();
        }
      }
    );
  } else {
    next();
  }
});

export default UserSchema;
