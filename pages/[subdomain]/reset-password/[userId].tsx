import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import React from 'react';
import ResetPasswordForm from '../../../components/forms/resetPasswordForm';
import Page from '../../../components/page/page';
import redirectToHome from '../../../helpers/redirectToHome';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return await redirectToHome(context);
}

/* istanbul ignore next */
export default function ResetPassword() {
  const router = useRouter();
  const { token, userId } = router.query;

  const decodedToken = typeof token === 'string' ? decodeURIComponent(token) : null;

  return (!decodedToken || typeof userId !== 'string' ? null :
    <Page title={'Reset Password'}>
      <ResetPasswordForm
        token={decodedToken}
        userId={userId}
      />
    </Page>
  );
}
