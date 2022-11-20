import mongoose from 'mongoose';
import cleanUser from '../../lib/cleanUser';
import MultiplayerMatch from '../db/multiplayerMatch';
import User from '../db/user';
import { MatchAction, MatchLog, MultiplayerMatchState, MultiplayerMatchType } from '../MultiplayerEnums';

export function generateMatchLog(type: MatchAction, log: any) {
  return {
    createdAt: new Date(),
    type: type,
    data: log,
  } as MatchLog;
}

const MultiplayerMatchSchema = new mongoose.Schema<MultiplayerMatch>(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    endTime: {
      type: Date,
    },
    levels: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Level',
    }],
    matchId: {
      type: String,
      required: true,
      unique: true,
    },
    matchLog: {
      // array of MatchLog
      type: [mongoose.Schema.Types.Mixed],
      required: true,
    },
    players: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    private: {
      type: Boolean,
      required: true,
    },
    rated: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: MultiplayerMatchType,
      required: true,
    },
    gameTable: {
      type: Map,
      of: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Level',
      }],
    },
    startTime: {
      type: Date,
    },
    state: {
      type: String,
      enum: MultiplayerMatchState,
      required: true,
    },
    winners: [{
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    }],
  },
  {
    timestamps: true,
  }
);

export function enrichMultiplayerMatch(match: MultiplayerMatch, user: User) {
  match.timeUntilStart = match.startTime ? match.startTime.getTime() - Date.now() : 0;
  match.timeUntilEnd = match.endTime ? match.endTime.getTime() - Date.now() : 0;
  cleanUser(match.createdBy);

  for (const player of match.players) {
    cleanUser(player);
  }

  for (const winner of match.winners) {
    cleanUser(winner);
  }

  if (match.state !== MultiplayerMatchState.FINISHED) {
    if (Date.now() < match?.startTime?.getTime()) {
      match.levels = []; // hide levels until match starts
    }
    else if (match.gameTable && match.gameTable[user._id.toString()]) {
    // if user is in score table... then we should return the first level they have not solved

      const levelIndex = match.gameTable[user._id.toString()].length || 0;

      match.levels = [match.levels[levelIndex]];
    } else {
      match.levels = []; // hide levels if user is not in score table
    }
  }

  match.scoreTable = {};

  for (const tableEntry in match.gameTable) {
    // create the scoreboard by counting non nulls
    match.scoreTable[tableEntry] = match.gameTable[tableEntry].filter((level) => level).length;
  }

  if (match.state !== MultiplayerMatchState.FINISHED) {
    match.gameTable = undefined; // hide the game table from the users
    match.matchLog = undefined;
  }

  return match;
}

export default MultiplayerMatchSchema;

// create index for matchId
MultiplayerMatchSchema.index({ matchId: 1 });
// create index for state
MultiplayerMatchSchema.index({ state: 1 });
// create index for type
MultiplayerMatchSchema.index({ type: 1 });
