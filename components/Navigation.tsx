import React, { useLayoutEffect, useRef, useState } from 'react';
import type { View } from '../types';

const ITEMS: View[] = ['Highlights', 'Experience', 'Work'];
type Marker = { left: number; right: number; direction: 'left' | 'right' };

const Navigation: React.FC<{
  activeView: View;
  onSelect: (view: View) => void;
}> = ({ activeView, onSelect }) => {
  const track = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<View | null>(null);
  const [marker, setMarker] = useState<Marker | null>(null);
  const target = preview ?? activeView;

  useLayoutEffect(() => {
    const element = track.current;
    if (!element) return;
    const measure = () => {
      const button = element.querySelector<HTMLButtonElement>(`[data-view="${target}"]`);
      if (!button) { setMarker(null); return; }
      const left = button.offsetLeft;
      const right = element.clientWidth - left - button.offsetWidth;
      setMarker(previous => {
        if (previous?.left === left && previous.right === right) return previous;
        return { left, right, direction: previous && left < previous.left ? 'left' : 'right' };
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    element.querySelectorAll('button').forEach(button => observer.observe(button));
    return () => observer.disconnect();
  }, [target]);

  return (
    <nav aria-label="Main navigation" className="mt-8 pt-6 border-t border-stone-200 dark:border-stone-800">
      <div ref={track} className="nav-track"
        onPointerLeave={() => setPreview(null)}
        onBlur={event => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPreview(null);
        }}>
        {ITEMS.map(item => (
          <button key={item} type="button" data-view={item}
            aria-current={activeView === item ? 'page' : undefined}
            className={`nav-link text-sm font-medium ${activeView === item ? 'active' : ''}`}
            onPointerEnter={event => { if (event.pointerType !== 'touch') setPreview(item); }}
            onFocus={event => { if (event.currentTarget.matches(':focus-visible')) setPreview(item); }}
            onClick={() => { setPreview(null); onSelect(item); }}>
            {item}
          </button>
        ))}
        {marker && <span className="nav-glass" aria-hidden="true" data-direction={marker.direction}
          style={{ left: marker.left, right: marker.right }}>
          <span key={target} className="nav-glass-shine" />
        </span>}
      </div>
    </nav>
  );
};

export default Navigation;
