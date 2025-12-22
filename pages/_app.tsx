import '../styles/globals.css';
import '../styles/form.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';

export default function MyApp({ Component, pageProps }: AppProps) {
    return (
        <>
            <Head>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
                <title>Auth System</title>
            </Head>
            <Component {...pageProps} />
        </>
    );
}