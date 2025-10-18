import { PlaygroundNav } from '@/components/PlaygroundNav';

export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Left Navigation Sidebar */}
      <PlaygroundNav />

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
