import { useEffect, useState } from "react";

type Props = {
  name: string;
  onDone: () => void;
};

export function WelcomeBanner({ name, onDone }: Props) {
  const full = `Velkommen, ${name}`;
  const [displayed, setDisplayed] = useState("");
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setDisplayed(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(interval);
        setTimeout(() => {
          setFading(true);
          setTimeout(onDone, 500);
        }, 900);
      }
    }, 35);
    return () => clearInterval(interval);
  }, [full, onDone]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
      style={{ opacity: fading ? 0 : 1, transition: "opacity 0.5s ease" }}
    >
      <p className="text-sm font-medium text-foreground/70">
        {displayed}
        <span className="animate-pulse opacity-60">|</span>
      </p>
    </div>
  );
}
