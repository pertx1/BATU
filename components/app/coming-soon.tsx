import { Sparkles } from "lucide-react";

export function ComingSoon({ text }: { text: string }) {
  return (
    <div className="card mt-2 flex flex-col items-center px-6 py-12 text-center animate-fade-up">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <Sparkles size={26} />
      </div>
      <p className="text-muted">{text}</p>
    </div>
  );
}
