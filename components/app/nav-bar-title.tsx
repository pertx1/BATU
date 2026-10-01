"use client";

import { useEffect, useState } from "react";

/** Título pequeño de la barra: aparece cuando el título grande sale de la pantalla. */
export function NavBarTitle({ title }: { title: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const large = document.getElementById("large-title");
    if (!large) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), {
      rootMargin: "-56px 0px 0px 0px",
    });
    observer.observe(large);
    return () => observer.disconnect();
  }, [title]);

  return (
    <p
      className={`min-w-0 flex-1 truncate text-center text-[17px] font-semibold transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden
    >
      {title}
    </p>
  );
}
