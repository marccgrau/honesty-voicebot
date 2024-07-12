import Image from 'next/image';

export const MobileNotSupported: React.FC = () => {
  return (
    <div className="z-10 flex h-screen flex-col items-center justify-center bg-white">
      <div className="text-center">
        <h2 className="mb-4 text-2xl font-bold">Only Desktop Supported Currently</h2>
        <p className="text-lg">Mobile devices coming soon...</p>
      </div>
      <div className="mt-8">
        <a href="https://unisg.ch" target="_blank" rel="noreferrer">
          <Image src="../../public/unisg-logo.png" alt="UNISG Logo" width={256} height={256} />
        </a>
      </div>
    </div>
  );
};
