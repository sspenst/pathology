import { GameId } from '@root/constants/GameId';
import { Types } from 'mongoose';
import Level from './level';
import User from './user';

interface Record {
  _id: Types.ObjectId;
  gameId: GameId;
  isDeleted: boolean;
  levelId: Types.ObjectId & Level;
  moves: number;
  ts: number;
  userId: Types.ObjectId & User;
}

export default Record;
