import '../styles/global.css';
import React, { useState } from 'react';
import { AppContext } from '../contexts/appContext';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import ProgressBar from '../components/progressBar';
import { Toaster } from 'react-hot-toast';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import newrelic from 'newrelic';

export default function MyApp({ Component, pageProps }: AppProps) {
  const [isLoading, setIsLoading] = useState<boolean>();

  return (
    <>
      <Head>
        <meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0' />
      </Head>
      <AppContext.Provider value={{
        setIsLoading: setIsLoading,
      }}>
        <ProgressBar isLoading={isLoading} />
        <Toaster toastOptions={{ duration: 1500 }}/>
        <Component {...pageProps} />
      </AppContext.Provider>
    </>
  );
}
