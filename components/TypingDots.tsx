'use client';

export function TypingDots() {
  return (
    <div className="flex items-center space-x-1">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-2 w-2 animate-blink rounded-full bg-slate-400"
          style={{ animationDelay: `${index * 0.2}s` }}
        />
      ))}
    </div>
  );
}
