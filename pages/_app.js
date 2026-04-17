import '../styles/globals.css';
import { Toaster } from 'react-hot-toast';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0D1526',
            color: '#F1F5F9',
            border: '1px solid #1E2D45',
            borderRadius: '10px',
            fontFamily: 'var(--font-dm-sans)',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#06B6D4', secondary: '#040812' },
          },
          error: {
            iconTheme: { primary: '#F43F5E', secondary: '#040812' },
          },
        }}
      />
    </>
  );
}
