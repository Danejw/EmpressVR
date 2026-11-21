"use client";

import { useEffect, useRef, useState } from "react";

export type GalleryImage = { src: string; alt: string };

export function GalleryLightbox({ images }: { images: GalleryImage[] }) {
  const [active, setActive] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (active === null) {
      if (dialog.current?.open) dialog.current.close();
    } else if (!dialog.current?.open) {
      dialog.current?.showModal();
    }
  }, [active]);

  useEffect(() => {
    if (active === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActive(current => current === null ? null : (current + 1) % images.length);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActive(current => current === null ? null : (current - 1 + images.length) % images.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, images.length]);

  if (!images.length) return null;
  return <>
    <div className="gallery-lightbox-grid" aria-label="The Self We Find image gallery">
      {images.map((item, index) => (
        <button key={item.src} className="gallery-lightbox-trigger"
          type="button" onClick={() => setActive(index)}
          aria-label={"View full size: " + item.alt}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.src} alt={item.alt} loading="lazy" decoding="async" />
          <span>View fullsize</span>
        </button>
      ))}
    </div>
    <dialog className="gallery-lightbox-dialog" ref={dialog}
      onClose={() => setActive(null)}
      onClick={event => { if (event.target === dialog.current) setActive(null); }}>
      {active !== null ? <>
        <div className="gallery-lightbox-top">
          <button type="button" autoFocus onClick={() => setActive(null)}
            aria-label="Close image viewer">Close ×</button>
        </div>
        <div className="gallery-lightbox-body">
          <button type="button" aria-label="Previous image"
            onClick={() => setActive((active - 1 + images.length) % images.length)}>‹</button>
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[active].src} alt={images[active].alt} />
            <figcaption>{images[active].alt} ({active + 1} of {images.length})</figcaption>
          </figure>
          <button type="button" aria-label="Next image"
            onClick={() => setActive((active + 1) % images.length)}>›</button>
        </div>
      </> : null}
    </dialog>
  </>;
}
