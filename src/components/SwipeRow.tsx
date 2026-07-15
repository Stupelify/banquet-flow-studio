
import { useRef, useState, type ReactNode } from 'react';

interface SwipeAction {
  label: string;
  color: string;
  onClick: () => void;
  icon?: ReactNode;
}

interface SwipeRowProps {
  actions: SwipeAction[];
  children: ReactNode;
  actionWidth?: number;
}

export default function SwipeRow({ actions, children, actionWidth = 74 }: SwipeRowProps) {
  const [offsetX, setOffsetX] = useState(0);
  const startX = useRef<number | null>(null);
  const startOffset = useRef(0);
  const totalWidth = actions.length * actionWidth;

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startOffset.current = offsetX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.touches[0].clientX - startX.current;
    const next = Math.max(-totalWidth, Math.min(0, startOffset.current + dx));
    setOffsetX(next);
  };

  const onTouchEnd = () => {
    startX.current = null;
    if (offsetX < -(totalWidth / 2)) {
      setOffsetX(-totalWidth);
    } else {
      setOffsetX(0);
    }
  };

  const close = () => setOffsetX(0);

  return (
    <div className="swipe-wrap">
      <div
        className="swipe-fg"
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
      <div className="swipe-actions" style={{ width: totalWidth }}>
        {actions.map((action, i) => (
          <button
            key={i}
            type="button"
            style={{ background: action.color, width: actionWidth }}
            onClick={() => { close(); action.onClick(); }}
            aria-label={action.label}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
