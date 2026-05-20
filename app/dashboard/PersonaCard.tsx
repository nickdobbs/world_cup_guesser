'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';

type PersonaCardProps = {
  rating: number;
  userPoints: number;
  maxPossible: number;
  finishedCount: number;
  fixtureCount: number;
};

export default function PersonaCard({
  rating,
  userPoints,
  maxPossible,
  finishedCount,
  fixtureCount,
}: PersonaCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  async function handleDownload() {
    if (!cardRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `we-are-26-persona-${rating}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="mb-12">
      <div
        ref={cardRef}
        className="grid grid-cols-1 gap-0 border-2 border-black bg-white lg:grid-cols-12"
      >
        <div className="flex flex-col justify-between border-b-2 border-black p-6 md:p-10 lg:col-span-7 lg:border-b-0 lg:border-r-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
              Your Predictor Rating
            </span>
            <h1 className="mt-3 text-5xl font-black uppercase leading-none tracking-tighter md:text-7xl lg:text-8xl">
              We Are<br />
              <span className="text-red-600">Twenty-Six</span>
            </h1>
            <p className="mt-6 max-w-md text-sm text-neutral-700">
              Your live rating across {finishedCount} finished
              {finishedCount === 1 ? ' match' : ' matches'}.
              Exact scores earn 3 pts; correct outcomes earn 1 pt.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-4 border-t-2 border-black pt-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                Points
              </div>
              <div className="mt-1 text-3xl font-black">{userPoints}</div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                Max
              </div>
              <div className="mt-1 text-3xl font-black">{maxPossible}</div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                Finished
              </div>
              <div className="mt-1 text-3xl font-black">
                {finishedCount}/{fixtureCount}
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex flex-col items-center justify-center bg-[#000080] p-8 text-white lg:col-span-5">
          <div className="absolute left-4 top-4 text-[10px] font-bold uppercase tracking-[0.25em] opacity-60">
            Persona / Rating
          </div>
          <div className="relative h-48 w-48 overflow-hidden border-2 border-white md:h-56 md:w-56">
            <Image
              src={`/personas/${rating}.png`}
              alt={`Persona for rating ${rating}`}
              fill
              sizes="(max-width: 768px) 192px, 224px"
              className="object-cover"
              priority
              unoptimized
            />
          </div>
          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-7xl font-black leading-none tracking-tighter text-green-400 md:text-8xl">
              {rating}
            </span>
            <span className="text-2xl font-bold text-white/70">/10</span>
          </div>
          <div className="mt-2 text-xs font-bold uppercase tracking-[0.25em] opacity-80">
            {finishedCount === 0 ? 'Awaiting Results' : 'Live Rating'}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDownload}
        disabled={isExporting}
        className="mt-4 w-full border-2 border-black bg-white py-4 text-sm font-bold uppercase tracking-widest text-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isExporting ? 'Generating image…' : 'Download My Persona'}
      </button>
    </section>
  );
}
