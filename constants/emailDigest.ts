export enum EmailKVTypes {
  LAST_TS_EMAIL_DIGEST = 'EMAIL_DIGEST.LAST_TS.',
  LAST_TS_EMAIL_MARKETING = 'EMAIL_MARKETING.LAST_TS.',
}
enum EmailDigest {
  DAILY = 'DAILY',
  ONLY_NOTIFICATIONS = 'ONLY_NOTIFICATIONS',
  NONE = 'NONE',
}

export default EmailDigest;
