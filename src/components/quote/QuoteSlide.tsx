import React, { useEffect, useRef, useState } from 'react';
import { cn } from "@/lib/utils";

interface QuoteSlideProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function QuoteSlide({ children, className, ...props }: QuoteSlideProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const parentWidth = containerRef.current.offsetWidth;
        // 1123px is A4 landscape width at 96 DPI (approx)
        // We use this as the reference width for the design
        const baseWidth = 1123; 
        
        // Calculate scale to fit the parent width
        // We allow scaling up if the screen is huge, but usually it's constrained by max-w-5xl
        const newScale = parentWidth / baseWidth;
        setScale(newScale);
      }
    };

    // Initial calculation
    updateScale();

    // Observer for container resize (more robust than window resize)
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // 794px is A4 landscape height at 96 DPI
  const baseHeight = 794;

  return (
    <div 
      ref={containerRef} 
      className="w-full relative mb-12" // mb-12 = 3rem, matching original margin
      style={{ height: `${baseHeight * scale}px` }}
    >
      <div 
        className={cn("quote-slide origin-top-left absolute top-0 left-0", className)}
        style={{
          width: `${1123}px`,
          height: `${baseHeight}px`,
          transform: `scale(${scale})`,
          margin: 0, // Reset margin as it's handled by wrapper
          maxWidth: 'none', // Override CSS max-width
          ...props.style
        }}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}
