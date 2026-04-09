import './globals.css';

export const metadata = {
  title: 'PDF → Veeva Loader',
  description: 'Extract SAT test steps from vendor PDFs and export as Veeva-compatible CSV / Excel',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
