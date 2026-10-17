import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f7f4ee] flex flex-col items-center justify-center px-6 py-20 text-center text-[#241a15]">
      <h1 className="text-[clamp(2.5rem,10vw,4rem)] font-bold tracking-tight mb-5">
        adgyn<span className="text-[#c8784a]">.</span>
      </h1>
      <p className="text-[clamp(1.2rem,4vw,1.8rem)] text-[#756e65] max-w-[550px] leading-relaxed mb-9">
        Your café. Your neighborhood.<br />
        A new connection with every scan.
      </p>
      <Link
        href="/demo/smart-sleeves"
        className="inline-block bg-[#2f5d4c] text-white px-8 py-3.5 rounded-lg font-semibold hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5d4c]"
      >
        Explore the café demo →
      </Link>
      <Link
        href="/login"
        className="mt-5 text-sm text-[#756e65] hover:text-[#241a15] transition-colors"
      >
        Dashboard login &rarr;
      </Link>
      <p className="mt-8 max-w-md text-xs leading-relaxed text-[#8b8173]">App links, local offers, community boards, and QR codes for your sleeves, signs, and tables. Explore without creating an account.</p>
      <footer className="fixed bottom-6 text-xs text-gray-400">
        &copy; 2026 adgyn
      </footer>
    </div>
  );
}
