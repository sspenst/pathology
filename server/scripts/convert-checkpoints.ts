// this script is now outdated
// run with ts-node -r tsconfig-paths/register --files server/scripts/convert-checkpoints.ts

import Direction, { getDirectionFromCode } from '@root/constants/direction';
import cliProgress from 'cli-progress';
import dotenv from 'dotenv';
import dbConnect from '../../lib/dbConnect';
import { KeyValueModel } from '../../models/mongoose';

'use strict';

dotenv.config();
console.log('env vars are ', dotenv.config().parsed);

async function init() {
  console.log('Connecting to db...');
  await dbConnect();
  console.log('connected');

  const checkpoints = await KeyValueModel.countDocuments({ key: { $regex: 'checkpoints' } });
  let i = 0;

  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

  progressBar.start(checkpoints, i);

  for await (const kvm of KeyValueModel.find({ key: { $regex: 'checkpoints' } })) {
    if (!kvm.value) {
      console.log(`\r${kvm.key} skipping undefined value`);
      continue;
    }

    for (const key of Object.keys(kvm.value)) {
      const checkpoint = kvm.value[key];

      if (Array.isArray(checkpoint)) {
        console.log(`\r${kvm.key}[${key}] skipping array`);
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const directions = checkpoint.moves.map((move: any) => getDirectionFromCode(move.code));

      for (const direction of directions) {
        if (!(direction in Direction)) {
          console.log(`\r${kvm.key}[${key}] invalid direction ${direction}`);
          continue;
        }
      }

      kvm.value[key] = directions;
    }

    await KeyValueModel.updateOne({ _id: kvm._id }, { $set: { value: kvm.value } });

    i++;
    progressBar.update(i);
  }

  progressBar.stop();
  process.exit(0);
}

init();
