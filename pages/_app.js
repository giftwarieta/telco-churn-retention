import '../styles/globals.css';
import Head from 'next/head';
import { Toaster } from 'react-hot-toast';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <Component {...pageProps} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            fontFamily: 'var(--font-dm-sans)',
            fontSize: '14px',
            boxShadow: '0 20px 60px rgba(15, 23, 42, 0.18)',
          },
          success: {
            iconTheme: { primary: '#0EA5E9', secondary: '#F8FAFC' },
          },
          error: {
            iconTheme: { primary: '#F43F5E', secondary: '#F8FAFC' },
          },
        }}
      />
    </>
  );
}
