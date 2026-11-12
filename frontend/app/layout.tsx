import AuthProvider from '../components/auth-provider';
import '../styles/auth.css';
import type { Metadata } from 'next';
import '../styles/globals.css';
import '../styles/charts.css';
import '../styles/tracker.css';
import '../styles/costs.css';
import '../styles/portfolio.css';
import '../styles/management.css';
import '../styles/site-stock.css';
import '../monthly.css';
export const metadata: Metadata = { title: 'Project Control', description: 'Unique Engineers project portfolio, TDS and procurement.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AuthProvider>{children}</AuthProvider></body></html>;
}
