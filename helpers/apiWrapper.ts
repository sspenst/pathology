import { Types } from 'mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
import { NextApiRequestWithAuth } from '../lib/withAuth';
import { logger } from './logger';

export interface ReqValidator {
  GET?: ReqExpected;
  POST?: ReqExpected,
  PUT?: ReqExpected,
  DELETE?: ReqExpected,
}
export interface ReqExpected {
  body?: { [key: string]: (value: unknown) => boolean };
  query?: { [key: string]: (value: unknown) => boolean };
}

/**
 *
 * @param type Type you want to check
 * @param mustExist Whether this value must exist
 * @param parsedString Whether to parse the string before checking type (i.e. from query params)
 * @returns
 */
export function ValidType(type: string, mustExist = true, parsedString = false) {
  return (value?: unknown) => {
    if (mustExist && value === undefined) {
      return false;
    }

    if (parsedString && value !== undefined) {
      let parsedType = 'string';

      try {
        parsedType = typeof JSON.parse(value as string);
      } catch (e) {
        // do nothing
      }

      return typeof value === 'string' && parsedType === type;
    } else if (value !== undefined) {
      return typeof value === type;
    } else {
      return true;
    }
  };
}

export function ValidEnum(values: string[]) {
  return (value?: unknown) => {
    if (!value) {
      return false;
    }

    return values.includes(value as string);
  };
}

export function ValidArray(mustExist = true) {
  return (value?: unknown) => {
    if (!mustExist && !value) {
      return true;
    }

    return Array.isArray(value);
  };
}

export function ValidNumber(mustExist = true, min?: number, max?: number, incrementAllowed?: number) {
  return (value?: unknown) => {
    if (!mustExist && !value) {
      return true;
    }

    if (typeof value !== 'number') {
      return false;
    }

    if (min !== undefined && value < min) {
      return false;
    }

    if (max !== undefined && value > max) {
      return false;
    }

    if (incrementAllowed !== undefined && value % incrementAllowed !== 0) {
      return false;
    }

    return true;
  };
}

export function ValidObjectId(mustExist = true) {
  return (value?: unknown) => {
    if (!mustExist && !value) {
      return true;
    }

    return Types.ObjectId.isValid(value as string);
  };
}

export function ValidObjectIdArray(mustExist = true) {
  return (value?: unknown) => {
    if (!mustExist && !value) {
      return true;
    }

    return Array.isArray(value) && value.every(v => Types.ObjectId.isValid(v as string));
  };
}

export function ValidObjectIdPNG(mustExist = true) {
  return (value?: unknown) => {
    if (!mustExist && !value) {
      return true;
    }

    // strip .png from id
    return Types.ObjectId.isValid((value as string)?.replace(/\.png$/, ''));
  };
}

export function parseReq(validator: ReqValidator, req: NextApiRequest | NextApiRequestWithAuth): {statusCode: number, error: string} | null {
  const expected = validator[req.method as 'GET' | 'POST' | 'PUT' | 'DELETE'];

  if (!expected) {
    logger.error(`Invalid method ${req.method} for url ${req.url}`);

    return {
      statusCode: 405,
      error: 'Method not allowed',
    };
  }

  const badKeys = [];

  if (expected.body !== undefined) {
    if (!req.body) {
      return {
        statusCode: 400,
        error: 'Bad request',
      };
    }

    for (const [key, validatorFn] of Object.entries(expected.body)) {
      const val = req.body[key];

      if (!validatorFn(val)) {
        badKeys.push('body.' + key);
      }
    }
  }

  if (expected.query !== undefined) {
    for (const [key, validatorFn] of Object.entries(expected.query)) {
      const val = req.query ? req.query[key] : undefined;

      if (!validatorFn(val)) {
        badKeys.push('query.' + key);
      }
    }
  }

  if (badKeys.length > 0) {
    return {
      statusCode: 400,
      error: 'Invalid ' + badKeys.sort().join(', ')
    };
  }

  return null;
}

export default function apiWrapper(validator: ReqValidator, handler: (req: NextApiRequest, res: NextApiResponse) => Promise<unknown>) {
  return async (req: NextApiRequest, res: NextApiResponse): Promise<unknown> => {
    const validate = parseReq(validator, req);

    if (validate !== null) {
      logger.error('API Handler Error', validate);

      return Promise.resolve(res.status(validate.statusCode).json({ error: validate.error }));
    }

    /* istanbul ignore next */
    return handler(req, res).catch((error: Error) => {
      logger.error('API Handler Error Caught', error);

      return res.status(500).send(error.message || error);
    });
  };
}
