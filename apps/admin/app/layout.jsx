import './globals.css';
import { cookies } from 'next/headers';
import AdminLayout from '../components/AdminLayout';

export const metadata = {
  title: 'Admin | HireForTravel',
  description: 'Admin Dashboard for HireForTravel',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }) {
  cookies();

  return (
    <html lang="en">
      <AdminLayout>{children}</AdminLayout>
    </html>
  );
}
