import type { CSSProperties } from "react";
import TimelineBoard from "@/components/TimelineBoard";
import { fetchActiveTimeline } from "@/lib/timelineServer";

export const metadata = {
  title: "Baseline Update Schedule",
  description:
    "Live roadmap for Baseline's investor update cadence and facility OS build.",
};

const radialStyle: CSSProperties = {
  backgroundImage:
    "radial-gradient(circle at 20% 20%, rgba(203,107,30,0.25), transparent 45%), radial-gradient(circle at 80% 0, rgba(79,158,219,0.2), transparent 55%)",
};

export default async function UpdateSchedulePage() {
  const timeline = await fetchActiveTimeline();

  return (
    <div className="min-h-screen bg-[#030303] text-[#f6e1bd]" style={radialStyle}>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-[#a99b82]">
          Roadmap / Schedule
        </p>
        <TimelineBoard timeline={timeline} />
      </main>
    </div>
  );
}
