import './globals.css';

export const metadata = {
  title: 'Magify Chatbot Demo',
  description: 'Open-source demo app showcasing the Magify Agent API',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
