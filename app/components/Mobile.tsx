export const MobileNotSupported: React.FC = () => {
  return (
    <div className="z-10 flex h-screen flex-col items-center justify-center bg-white">
      <div className="text-center">
        <h2 className="mb-4 text-2xl font-bold">Only Desktop Supported Currently</h2>
        <p className="text-lg">Mobile devices coming soon...</p>
      </div>
      <div className="mt-8">
        <a href="https://git.new/ai-devices" target="_blank" rel="noreferrer">
          <img
            src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white"
            alt="GitHub"
          />
        </a>
      </div>
    </div>
  );
};
