import React from 'react';
import { Sidebar } from './Sidebar';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#F1F5F9' }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: '#F1F5F9',
        }}
      >
        {children}
      </main>
    </div>
  );
}
