import Image from 'next/image';
import logo from '../public/unisg_logo.png';

export const MobileNotSupported: React.FC = () => {
  return (
    <div className="z-10 flex h-screen flex-col items-center justify-center bg-white">
      <div className="text-center">
        <h2 className="mb-4 text-2xl font-bold">Only Desktop Supported Currently</h2>
        <p className="text-lg">Mobile devices coming soon...</p>
      </div>
      <div className="mt-8">
        <a href="https://unisg.ch" target="_blank" rel="noreferrer">
          <Image src={logo} alt="UNISG Logo" width={128} height={128} />
        </a>
      </div>
    </div>
  );
};
