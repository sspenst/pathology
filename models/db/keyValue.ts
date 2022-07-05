import { Types } from 'mongoose';

// represents a document from the pathology.users collection
interface KeyValue {
  _id: Types.ObjectId;
  key: string;
  value: Types.Subdocument;
  ts: number;
  expires: number;
}

export default KeyValue;
