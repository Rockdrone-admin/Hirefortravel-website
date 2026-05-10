import './globals.css';
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
  return (
    <html lang="en">
      <AdminLayout>{children}</AdminLayout>
    </html>
  );
}
