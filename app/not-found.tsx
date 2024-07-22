// app/not_found.tsx
'use client';
import React from 'react';
import Link from 'next/link';

const NotFoundPage: React.FC = () => {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gray-100 text-center">
      <h1 className="text-4xl font-bold text-gray-800">404 - Page Not Found</h1>
      <p className="mt-4 text-gray-600">Sorry, the page you are looking for does not exist.</p>
      <Link href="/">Go to Homepage</Link>
    </div>
  );
};

export default NotFoundPage;
