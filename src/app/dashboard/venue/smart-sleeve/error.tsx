"use client";

export default function Error({ reset }: { reset: () => void }) {
  return <div className="min-h-screen bg-[#f7f4ee] p-8 flex items-center justify-center"><div className="max-w-md text-center"><h1 className="text-2xl font-semibold">Your workspace needs a moment.</h1><p className="mt-4 text-sm text-stone-600">We couldn’t load your published experiences. Your saved drafts are still on this device.</p><button type="button" onClick={reset} className="mt-6 rounded-lg bg-[#2f5d4c] px-5 py-3 text-sm font-medium text-white">Try again</button></div></div>;
}
