import React, { useState, useEffect, useRef } from 'react';
import { Map, Maximize2, Minimize2, X, Move } from 'lucide-react';
import { useDelivery } from '../../context/delivery.context';
import { getRestaurantBrandMarker } from '../../utils/restaurant-branding';

type Position = { x: number; y: number };
type Size = 'small' | 'medium' | 'large' | 'xlarge' | 'full';

// שכונות תל אביב עם קואורדינטות יחסיות
const TEL_AVIV_NEIGHBORHOODS = [
  { name: 'צפון הישן', x: 50, y: 15 },
  { name: 'רמת אביב', x: 25, y: 20 },
  { name: 'רמת החיל', x: 75, y: 25 },
  { name: 'יפו', x: 20, y: 80 },
  { name: 'נווה צדק', x: 35, y: 70 },
  { name: 'פלורנטין', x: 45, y: 75 },
  { name: 'שפירא', x: 55, y: 65 },
  { name: 'נחלת בנימין', x: 50, y: 50 },
  { name: 'דיזנגוף', x: 55, y: 40 },
  { name: 'הצפון החדש', x: 40, y: 30 },
  { name: 'נמל תל אביב', x: 30, y: 35 },
  { name: 'מרכז העיר', x: 48, y: 55 },
];

export const MiniMap: React.FC = () => {
  const { state } = useDelivery();
  const gridId = React.useId(); // מזהה ייחודי לפאטרן הרשת
  const [isOpen, setIsOpen] = useState(false);
  const [size, setSize] = useState<Size>('medium');
  const [position, setPosition] = useState<Position>({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [isDark, setIsDark] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // גדלים
  const sizes = {
    small: { width: 250, height: 180 },
    medium: { width: 350, height: 250 },
    large: { width: 500, height: 350 },
    xlarge: { width: 700, height: 500 },
    full: { width: 900, height: 650 },
  };

  const currentSize = sizes[size];

  // זיהוי מצב כהה/בהיר
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  // סירקול הגדלים
  const toggleSize = () => {
    const sizeOrder: Size[] = ['small', 'medium', 'large', 'xlarge', 'full'];
    const currentIndex = sizeOrder.indexOf(size);
    const nextIndex = (currentIndex + 1) % sizeOrder.length;
    setSize(sizeOrder[nextIndex]);
  };

  // גרירה
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.map-controls')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - currentSize.width));
      const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - currentSize.height));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, currentSize.width, currentSize.height]);

  // חישוב נתונים
  const activeDeliveries = state.deliveries.filter(d => 
    d.status === 'assigned' || d.status === 'delivering'
  );

  const activeRestaurants = state.restaurants.filter(r => r.isActive);
  const activeCouriers = state.couriers.filter(c => c.status === 'available' || c.status === 'busy');

  // FAB Button
  if (!isOpen) {
    return (
      null
    );
  }

  // ייצור סמנים רנדומליים
  const generateMarkers = () => {
    const markers = [];
    
    // מסעדות פעילות
    activeRestaurants.slice(0, 8).forEach((restaurant, idx) => {
      const neighborhood = TEL_AVIV_NEIGHBORHOODS[idx % TEL_AVIV_NEIGHBORHOODS.length];
      markers.push({
        id: restaurant.id,
        type: 'restaurant',
        x: neighborhood.x + (Math.random() - 0.5) * 10,
        y: neighborhood.y + (Math.random() - 0.5) * 10,
        label: restaurant.name,
      });
    });

    // שליחים פעילים
    activeCouriers.slice(0, 6).forEach((courier, idx) => {
      markers.push({
        id: courier.id,
        type: 'courier',
        x: Math.random() * 90 + 5,
        y: Math.random() * 90 + 5,
        label: courier.name,
      });
    });

    // לקוחות (משלוחים פעילים)
    activeDeliveries.slice(0, 10).forEach((delivery, idx) => {
      markers.push({
        id: delivery.id,
        type: 'customer',
        x: Math.random() * 90 + 5,
        y: Math.random() * 90 + 5,
        label: delivery.customerName,
      });
    });

    return markers;
  };

  const markers = generateMarkers();

  return (
    <div
      ref={containerRef}
      className="fixed z-50 shadow-2xl rounded-2xl overflow-hidden border-2 border-[#9fe870]/50 backdrop-blur-sm"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${currentSize.width}px`,
        height: `${currentSize.height}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-[#9fe870] to-transparent p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Move className="w-4 h-4 text-[#0d0d12]" />
          <h3 className="text-sm font-bold text-[#0d0d12]">מפה חיה - תל אביב</h3>
        </div>
        
        <div className="flex items-center gap-1 map-controls">
          <button
            onClick={toggleSize}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1"
            title={`גודל נוכחי: ${size === 'small' ? 'קטן' : size === 'medium' ? 'בינוני' : size === 'large' ? 'גדול' : size === 'xlarge' ? 'גדול מאוד' : 'מלא'}`}
          >
            {(size === 'xlarge' || size === 'full') ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            {size === 'full' && <span className="text-xs">מלא</span>}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-red-500/50 rounded-lg transition-colors"
            title="סגור"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Map SVG */}
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        style={{ background: isDark ? '#1a1a1a' : '#e8f5e9' }}
      >
        {/* רקע עיר */}
        <defs>
          <pattern id={`grid-${gridId}`} width="10" height="10" patternUnits="userSpaceOnUse">
            <path
              d="M 10 0 L 0 0 0 10"
              fill="none"
              stroke={isDark ? '#2a2a2a' : '#d0e7d2'}
              strokeWidth="0.3"
            />
          </pattern>
        </defs>
        <rect width="100" height="100" fill={`url(#grid-${gridId})`} />

        {/* רחובות */}
        <g opacity="0.3">
          <line x1="10" y1="30" x2="90" y2="30" stroke={isDark ? '#444' : '#a5d6a7'} strokeWidth="0.5" />
          <line x1="10" y1="50" x2="90" y2="50" stroke={isDark ? '#444' : '#a5d6a7'} strokeWidth="0.5" />
          <line x1="10" y1="70" x2="90" y2="70" stroke={isDark ? '#444' : '#a5d6a7'} strokeWidth="0.5" />
          <line x1="30" y1="10" x2="30" y2="90" stroke={isDark ? '#444' : '#a5d6a7'} strokeWidth="0.5" />
          <line x1="50" y1="10" x2="50" y2="90" stroke={isDark ? '#444' : '#a5d6a7'} strokeWidth="0.5" />
          <line x1="70" y1="10" x2="70" y2="90" stroke={isDark ? '#444' : '#a5d6a7'} strokeWidth="0.5" />
        </g>

        {/* שכונות */}
        {TEL_AVIV_NEIGHBORHOODS.map((neighborhood, idx) => (
          <g key={idx}>
            <circle
              cx={neighborhood.x}
              cy={neighborhood.y}
              r="1"
              fill={isDark ? '#555' : '#81c784'}
              opacity="0.3"
            />
            {size !== 'small' && (
              <text
                x={neighborhood.x}
                y={neighborhood.y + 3}
                fontSize="1.5"
                fill={isDark ? '#888' : '#558b2f'}
                textAnchor="middle"
                opacity="0.5"
              >
                {neighborhood.name}
              </text>
            )}
          </g>
        ))}

        {/* סמנים */}
        {markers.map((marker) => {
          const colors = {
            restaurant: { fill: '#9c27b0', stroke: '#ffffff' },
            courier: { fill: '#2196f3', stroke: '#ffffff' },
            customer: { fill: '#4caf50', stroke: '#ffffff' },
          };
          const color = colors[marker.type as keyof typeof colors];

          const brandMarker =
            marker.type === 'restaurant' ? getRestaurantBrandMarker(marker.label) : null;

          return (
            <g key={marker.id} className="hover:opacity-80 transition-opacity">
              <circle
                cx={marker.x}
                cy={marker.y}
                r="2"
                fill={brandMarker?.fill ?? color.fill}
                stroke="none"
                className="animate-pulse"
              >
                <title>{marker.label}</title>
              </circle>
              {marker.type === 'restaurant' && brandMarker && (
                <text
                  x={marker.x}
                  y={marker.y + 0.7}
                  fontSize="1.8"
                  fontWeight="900"
                  fill={brandMarker.text}
                  textAnchor="middle"
                >
                  {brandMarker.label}
                </text>
              )}
              {marker.type === 'courier' && (
                <circle
                  cx={marker.x}
                  cy={marker.y}
                  r="3"
                  fill="none"
                  stroke={color.fill}
                  strokeWidth="0.3"
                  opacity="0.5"
                >
                  <animate
                    attributeName="r"
                    from="2"
                    to="5"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    from="0.5"
                    to="0"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 z-20">
        <div className="flex items-center justify-around text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#9c27b0]"></div>
            <span className="text-white font-medium">{activeRestaurants.length} מסעדות</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#2196f3]"></div>
            <span className="text-white font-medium">{activeCouriers.length} שליחים</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#4caf50]"></div>
            <span className="text-white font-medium">{activeDeliveries.length} לקוחות</span>
          </div>
        </div>
      </div>
    </div>
  );
};
