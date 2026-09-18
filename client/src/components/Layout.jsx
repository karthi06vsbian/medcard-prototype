import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ role, children }) => {
  return (
    <div className="min-h-screen bg-[#F5F9FF] text-[#172B4D] flex">
      <Sidebar role={role} />
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen overflow-hidden">
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

