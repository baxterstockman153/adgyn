import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F5F0EB] flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-[clamp(2.5rem,10vw,4rem)] font-bold mb-5">
        ad<span className="text-purple-700">gyn</span>
      </h1>
      <p className="font-serif text-[clamp(1.2rem,4vw,1.8rem)] text-gray-600 max-w-[520px] leading-relaxed mb-9">
        Local advertising, reimagined.<br />
        Put your business in front of the right neighbors.
      </p>
      <Link
        href="mailto:hello@adgyn.com"
        className="inline-block bg-gray-900 text-white px-8 py-3.5 rounded-lg font-semibold hover:opacity-80 transition-opacity"
      >
        Get Early Access
      </Link>
      <Link
        href="/login"
        className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        Dashboard login &rarr;
      </Link>
      <footer className="fixed bottom-6 text-xs text-gray-400">
        &copy; 2026 adgyn
      </footer>
    </div>
  );
}
