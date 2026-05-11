'use client';

import React, { useRef, useEffect, useState } from 'react';

export default function LogoMarquee({ logos }) {
  const containerRef = useRef(null);
  const scrollRef = useRef(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Quadruple the logos to ensure we always have enough to cover large screens
  const displayLogos = [...logos, ...logos, ...logos, ...logos];

  useEffect(() => {
    if (isPaused || isDragging) return;

    const container = containerRef.current;
    if (!container) return;

    let animationFrameId;

    const scroll = () => {
      // Speed factor
      scrollRef.current += 0.8; 
      
      if (container) {
        // We reset when we've scrolled exactly two sets worth of logos.
        // Since we have four sets, set 1+2 are identical to set 3+4.
        const resetPoint = container.scrollWidth / 2;
        if (scrollRef.current >= resetPoint) {
          scrollRef.current -= resetPoint;
        }
        container.scrollLeft = scrollRef.current;
      }
      
      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPaused, isDragging, logos.length]);

  // Handle manual drag-to-scroll
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed multiplier
    const newScrollLeft = scrollLeft - walk;
    containerRef.current.scrollLeft = newScrollLeft;
    scrollRef.current = newScrollLeft;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="marquee-wrapper">
      <div 
        ref={containerRef}
        className="marquee-container"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => {
          setIsPaused(false);
          handleMouseUpOrLeave();
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        aria-label="Client logos"
      >
        <div className="marquee-track">
          {displayLogos.map((logo, index) => (
            <div key={`${logo.id || logo.company_name}-${index}`} className="client-logo" style={{ userSelect: 'none', WebkitUserDrag: 'none' }}>
              <img 
                src={logo.logo_url} 
                alt={logo.alt_text || logo.company_name} 
                loading="lazy" 
                draggable="false"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
