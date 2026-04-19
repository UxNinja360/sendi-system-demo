import React, { useMemo, useState, useEffect } from 'react';
import { isMcDonaldsRestaurant } from '../../utils/restaurant-branding';

interface Delivery {
  id: string;
  restaurantId: string;
  customerId: string;
  customerName: string;
  address: string;
  status: string;
  price: number;
  createdAt: string;
}

interface Restaurant {
  id: string;
  name: string;
  address: string;
}

interface PendingDeliveriesMapProps {
  deliveries: Delivery[];
  restaurants: Restaurant[];
  hoveredDeliveryId?: string | null;
}

// תל אביב - שכונות עם קואורדינטות יחסיות
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

// פונקציה לחישוב קואורדינטות קבועות מ-ID
const getPositionFromId = (id: string, offset: number = 0): { x: number; y: number } => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash = hash & hash;
  }
  const absHash = Math.abs(hash + offset);
  const x = (absHash % 70) + 15; // 15-85
  const y = ((absHash * 7) % 70) + 15; // 15-85
  return { x, y };
};

export const PendingDeliveriesMap: React.FC<PendingDeliveriesMapProps> = ({
  deliveries,
  restaurants,
  hoveredDeliveryId,
}) => {
  const gridId = React.useId(); // מזהה ייחודי לפאטרן הרשת
  const [isDark, setIsDark] = useState(false);

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

  // חישוב מיקומים
  const markers = useMemo(() => {
    const result: Array<{
      id: string;
      type: 'restaurant' | 'delivery';
      position: { x: number; y: number };
      label: string;
      delivery?: Delivery;
      restaurant?: Restaurant;
      isHighlighted?: boolean;
    }> = [];

    // הוסף מסעדות
    const restaurantIds = new Set(deliveries.map(d => d.restaurantId));
    restaurantIds.forEach(restId => {
      const restaurant = restaurants.find(r => r.id === restId);
      if (restaurant) {
        result.push({
          id: restaurant.id,
          type: 'restaurant',
          position: getPositionFromId(restaurant.id, 100),
          label: restaurant.name,
          restaurant,
        });
      }
    });

    // הוסף משלוחים
    deliveries.forEach(delivery => {
      result.push({
        id: delivery.id,
        type: 'delivery',
        position: getPositionFromId(delivery.id, 200),
        label: delivery.customerName,
        delivery,
        isHighlighted: delivery.id === hoveredDeliveryId,
      });
    });

    return result;
  }, [deliveries, restaurants, hoveredDeliveryId]);

  return (
    <div className="relative w-full h-full bg-[#f9fafb] dark:bg-[#0d0d12] rounded-xl overflow-hidden border border-[#e5e5e5] dark:border-[#262626]">
      {/* רקע מפה */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* רשת רקע */}
        <defs>
          <pattern id={`grid-${gridId}`} width="10" height="10" patternUnits="userSpaceOnUse">
            <path 
              d="M 10 0 L 0 0 0 10" 
              fill="none" 
              stroke={isDark ? '#262626' : '#e5e5e5'} 
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100" height="100" fill={`url(#grid-${gridId})`} />
        
        {/* שכונות תל אביב */}
        {TEL_AVIV_NEIGHBORHOODS.map(neighborhood => (
          <g key={neighborhood.name}>
            <circle
              cx={neighborhood.x}
              cy={neighborhood.y}
              r="1.5"
              fill={isDark ? '#404040' : '#d4d4d4'}
              opacity="0.3"
            />
            <text
              x={neighborhood.x}
              y={neighborhood.y + 4}
              fontSize="2"
              fill={isDark ? '#666d80' : '#999999'}
              textAnchor="middle"
              opacity="0.5"
            >
              {neighborhood.name}
            </text>
          </g>
        ))}

        {/* קווים בין מסעדות למשלוחים */}
        {markers
          .filter(m => m.type === 'delivery')
          .map(deliveryMarker => {
            const restaurantMarker = markers.find(
              m => m.type === 'restaurant' && m.id === deliveryMarker.delivery?.restaurantId
            );
            if (!restaurantMarker) return null;

            return (
              <line
                key={`line-${deliveryMarker.id}`}
                x1={restaurantMarker.position.x}
                y1={restaurantMarker.position.y}
                x2={deliveryMarker.position.x}
                y2={deliveryMarker.position.y}
                stroke={
                  deliveryMarker.isHighlighted
                    ? '#10b981'
                    : isDark
                    ? '#404040'
                    : '#d4d4d4'
                }
                strokeWidth={deliveryMarker.isHighlighted ? '0.4' : '0.2'}
                strokeDasharray={deliveryMarker.isHighlighted ? '0' : '2,2'}
                opacity={deliveryMarker.isHighlighted ? '0.8' : '0.3'}
              />
            );
          })}

        {/* סמני מסעדות */}
        {markers
          .filter(m => m.type === 'restaurant')
          .map(marker => (
            <g key={marker.id}>
              {isMcDonaldsRestaurant(marker.label) ? (
                <>
                  <rect
                    x={marker.position.x - 2.5}
                    y={marker.position.y - 2.5}
                    width="5"
                    height="5"
                    rx="1"
                    fill="#da291c"
                    stroke={isDark ? '#171717' : '#ffffff'}
                    strokeWidth="0.6"
                  />
                  <text
                    x={marker.position.x}
                    y={marker.position.y + 1}
                    fontSize="3"
                    fontWeight="900"
                    fill="#ffc72c"
                    textAnchor="middle"
                  >
                    M
                  </text>
                </>
              ) : (
                <>
                  <circle
                    cx={marker.position.x}
                    cy={marker.position.y}
                    r="2.5"
                    fill={isDark ? '#171717' : '#ffffff'}
                    stroke="#ef4444"
                    strokeWidth="0.6"
                  />
                  <circle
                    cx={marker.position.x}
                    cy={marker.position.y}
                    r="1.2"
                    fill="#ef4444"
                  />
                </>
              )}
            </g>
          ))}

        {/* סמני משלוחים */}
        {markers
          .filter(m => m.type === 'delivery')
          .map(marker => {
            const statusColor =
              marker.delivery?.status === 'pending'
                ? '#f59e0b'
                : marker.delivery?.status === 'assigned'
                ? '#3b82f6'
                : '#8b5cf6';

            return (
              <g key={marker.id}>
                <circle
                  cx={marker.position.x}
                  cy={marker.position.y}
                  r={marker.isHighlighted ? '3.5' : '2.5'}
                  fill={isDark ? '#171717' : '#ffffff'}
                  stroke={marker.isHighlighted ? '#10b981' : statusColor}
                  strokeWidth={marker.isHighlighted ? '0.8' : '0.6'}
                  className="transition-all duration-200"
                />
                <circle
                  cx={marker.position.x}
                  cy={marker.position.y}
                  r={marker.isHighlighted ? '1.8' : '1.2'}
                  fill={marker.isHighlighted ? '#10b981' : statusColor}
                  className="transition-all duration-200"
                />
                {marker.isHighlighted && (
                  <circle
                    cx={marker.position.x}
                    cy={marker.position.y}
                    r="4.5"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="0.3"
                    opacity="0.3"
                  >
                    <animate
                      attributeName="r"
                      from="3.5"
                      to="6"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.6"
                      to="0"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            );
          })}
      </svg>

      {/* אגדה */}
      <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-[#171717]/90 backdrop-blur-sm rounded-lg p-3 border border-[#e5e5e5] dark:border-[#262626] shadow-lg">
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-white dark:bg-[#171717] border-2 border-[#ef4444] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]"></div>
            </div>
            <span className="text-[#666d80] dark:text-[#a3a3a3]">מסעדה</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-white dark:bg-[#171717] border-2 border-[#f59e0b] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></div>
            </div>
            <span className="text-[#666d80] dark:text-[#a3a3a3]">ממתין</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-white dark:bg-[#171717] border-2 border-[#3b82f6] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]"></div>
            </div>
            <span className="text-[#666d80] dark:text-[#a3a3a3]">משוייך</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-white dark:bg-[#171717] border-2 border-[#8b5cf6] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]"></div>
            </div>
            <span className="text-[#666d80] dark:text-[#a3a3a3]">באיסוף</span>
          </div>
        </div>
      </div>

      {/* מונה משלוחים */}
      <div className="absolute top-4 left-4 bg-white/90 dark:bg-[#171717]/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-[#e5e5e5] dark:border-[#262626] shadow-lg">
        <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">
          {deliveries.length} משלוחים פעילים
        </div>
      </div>
    </div>
  );
};
