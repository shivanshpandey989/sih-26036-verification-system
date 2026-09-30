import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout({
  title,
  breadcrumb,
  children,
}: {
  title: string;
  breadcrumb?: string[];
  children: ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} breadcrumb={breadcrumb} />
        <main className="flex-1 overflow-y-auto bg-surface p-6">{children}</main>
      </div>
    </div>
  );
}
