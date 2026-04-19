import React, { useEffect, useState, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import svgPaths from '../../../../imports/svg-8wcloaly6f';
import imgImage from "figma:asset/9487a31c2533a8e5469e62ce77d2a6e90dffd8ba.png";
import imgImage1 from "figma:asset/db955d4ea0eb194474975c181f8978c10e5559ee.png";
import imgImage2 from "figma:asset/3c35929df50c3e42adc2f672ef43eb1470b471e0.png";
import imgImage3 from "figma:asset/bd5dc7da069c1114cee1c058edd30859efe3976d.png";
import imgImage4 from "figma:asset/42e41331ce1348635925ad4fadf14e10c5bc7452.png";
import imgImage5 from "figma:asset/5847cbfd29b2f828f0d864b491943a94dd8d8ddd.png";
import imgImage6 from "figma:asset/f727f10f9679b6608307319f33af262f0dc8d84a.png";
import imgImage7 from "figma:asset/7ebe2c8e252f61f8911a449a38ae091f3771c56f.png";
import imgImage8 from "figma:asset/e48e5fa5d2740364d6dbd74c9ff2fb2eb999cbd4.png";
import imgImage9 from "figma:asset/651cfc9f17254e7988d0a8d0fc6a3237f75e80c6.png";
import imgImage10 from "figma:asset/785df089a3ea9090028c5df9572000366b57f1b6.png";
import imgImage11 from "figma:asset/5b1956dee8d0cb85e9d52d64f26cc2f21b9268b8.png";
import imgImage12 from "figma:asset/de308f1f2b1e1c760e62fb3907f3eaefb2cf3541.png";
import imgImage13 from "figma:asset/fdcb96973c5e02368121ad59cbbce9f438abbcad.png";
import imgImage14 from "figma:asset/462bf44d096535e7acf5492058d74ee0ccc90669.png";
import imgImage15 from "figma:asset/aa6d6f6317c5a6874ec798cb039a91eb893d8f05.png";
import imgImage16 from "figma:asset/7b4b0a5cfe801359254cacba596e327eb259ebb4.png";
import imgImage17 from "figma:asset/1b5d5254e6775b1820bad53ce0ab6ff91dfba2d0.png";
import imgImage18 from "figma:asset/25ea867f037e5f44ced6c1b49fc9fa942d89093f.png";
import imgImage19 from "figma:asset/657cae85bb1037ade1c3b864f654f8366cea92c2.png";
import imgImage20 from "figma:asset/1a4c9dffe178761f2e5618bc6e4ef75f66b3e5db.png";
import imgImage21 from "figma:asset/178a8d9cbbaa48ca5443904e24587c66aace3a6e.png";
import imgImage22 from "figma:asset/ff8885da633f548cdd93691ceeb0bb438cccc462.png";
import imgImage23 from "figma:asset/2c293b66bffe5a090ded7ae9f292d0f70f61fce4.png";
import imgImage24 from "figma:asset/6c78803d6c2c5fe8d53ad8d950a784c9c8e91dbc.png";
import imgImage25 from "figma:asset/1aa399f608c8926860fc24e9d5581c82d46515ad.png";
import imgImage26 from "figma:asset/e2e3e1bbd4a02cbb82fea12a6f000029aa249ae0.png";
import imgImage27 from "figma:asset/bb7a2c5aefa1508134745cb2f366774ef87c9f10.png";

interface MapMarker {
  lat: number;
  lng: number;
  name?: string;
}

interface Order {
  id: string;
  deliveryId: string;
  lat: number;
  lng: number;
  customerName: string;
  status: string;
  courierName?: string;
}

interface Courier {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
}

interface RealMapProps {
  orders: Order[];
  selectedId: string | null;
  couriers: Courier[];
  restaurants: MapMarker[];
  customers: MapMarker[];
  onOrderHover?: (orderId: string | null) => void;
  onCourierHover?: (courierId: string | null) => void;
  onRestaurantHover?: (restaurantName: string | null) => void;
  hoveredOrderId?: string | null;
  hoveredCourierId?: string | null;
  hoveredRestaurantName?: string | null;
}

// Map tile images array
const mapTiles = [
  { img: imgImage, left: 596, top: 287 },
  { img: imgImage1, left: 596, top: 543 },
  { img: imgImage2, left: 340, top: 287 },
  { img: imgImage3, left: 852, top: 287 },
  { img: imgImage4, left: 340, top: 543 },
  { img: imgImage5, left: 852, top: 543 },
  { img: imgImage6, left: 596, top: 31 },
  { img: imgImage7, left: 596, top: 799 },
  { img: imgImage2, left: 340, top: 31 },
  { img: imgImage8, left: 852, top: 31 },
  { img: imgImage9, left: 340, top: 799 },
  { img: imgImage10, left: 852, top: 799 },
  { img: imgImage2, left: 84, top: 287 },
  { img: imgImage11, left: 1108, top: 287 },
  { img: imgImage2, left: 84, top: 543 },
  { img: imgImage12, left: 1108, top: 543 },
  { img: imgImage13, left: 596, top: -225 },
  { img: imgImage2, left: 84, top: 31 },
  { img: imgImage14, left: 1108, top: 31 },
  { img: imgImage2, left: 84, top: 799 },
  { img: imgImage15, left: 1108, top: 799 },
  { img: imgImage16, left: 596, top: 1055 },
  { img: imgImage2, left: 340, top: -225 },
  { img: imgImage17, left: 852, top: -225 },
  { img: imgImage18, left: 340, top: 1055 },
  { img: imgImage19, left: 852, top: 1055 },
  { img: imgImage2, left: -172, top: 287 },
  { img: imgImage20, left: 1364, top: 287 },
  { img: imgImage2, left: -172, top: 543 },
  { img: imgImage21, left: 1364, top: 543 },
  { img: imgImage2, left: 84, top: -225 },
  { img: imgImage22, left: 1108, top: -225 },
  { img: imgImage2, left: 84, top: 1055 },
  { img: imgImage23, left: 1108, top: 1055 },
  { img: imgImage2, left: -172, top: 31 },
  { img: imgImage24, left: 1364, top: 31 },
  { img: imgImage2, left: -172, top: 799 },
  { img: imgImage25, left: 1364, top: 799 },
  { img: imgImage2, left: -172, top: -225 },
  { img: imgImage26, left: 1364, top: -225 },
  { img: imgImage2, left: -172, top: 1055 },
  { img: imgImage27, left: 1364, top: 1055 },
];

// Marker icon components
function CourierIcon() {
  return (
    <svg className="w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
      <g>
        <path d={svgPaths.p2c4f400} fill="white" stroke="white" strokeWidth="1.66667" />
        <g>
          <path d={svgPaths.p29becb18} fill="white" />
          <path d={svgPaths.p29becb18} stroke="white" strokeWidth="1.66667" />
        </g>
      </g>
    </svg>
  );
}

function DeliveredIcon() {
  return (
    <svg className="w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
      <g>
        <g>
          <path d={svgPaths.p27365a00} fill="white" />
          <path d={svgPaths.p27365a00} stroke="white" strokeWidth="1.66667" />
        </g>
        <path d={svgPaths.p32ab0300} fill="white" stroke="white" strokeWidth="1.66667" />
      </g>
    </svg>
  );
}

function RestaurantIcon() {
  return (
    <svg className="w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
      <g>
        <path d={svgPaths.p2213f00} fill="white" stroke="white" strokeWidth="1.66667" />
      </g>
    </svg>
  );
}

export const RealMap: React.FC<RealMapProps> = ({ 
  orders, 
  selectedId, 
  couriers, 
  restaurants, 
  customers,
  onOrderHover,
  onCourierHover,
  onRestaurantHover,
  hoveredOrderId,
  hoveredCourierId,
  hoveredRestaurantName,
}) => {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate zoom change
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(zoom * delta, 0.5), 3);
    
    // Calculate new pan to keep mouse position stable
    const scale = newZoom / zoom;
    const newPan = {
      x: mouseX - (mouseX - pan.x) * scale,
      y: mouseY - (mouseY - pan.y) * scale,
    };
    
    setZoom(newZoom);
    setPan(newPan);
  };

  const handleZoomIn = () => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const newZoom = Math.min(zoom * 1.2, 3);
    const scale = newZoom / zoom;
    
    const newPan = {
      x: centerX - (centerX - pan.x) * scale,
      y: centerY - (centerY - pan.y) * scale,
    };
    
    setZoom(newZoom);
    setPan(newPan);
  };

  const handleZoomOut = () => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const newZoom = Math.max(zoom * 0.8, 0.5);
    const scale = newZoom / zoom;
    
    const newPan = {
      x: centerX - (centerX - pan.x) * scale,
      y: centerY - (centerY - pan.y) * scale,
    };
    
    setZoom(newZoom);
    setPan(newPan);
  };

  const resetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* כותרת */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="bg-white/95 dark:bg-[#171717]/95 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-[#e5e5e5] dark:border-[#262626] pointer-events-auto">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#9fe870]" />
            <span className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">מפת תל אביב - Live</span>
          </div>
        </div>
        
        {/* אגדה */}
        <div className="bg-white/95 dark:bg-[#171717]/95 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-[#e5e5e5] dark:border-[#262626] pointer-events-auto">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-[#9333ea] rounded-full"></div>
              <span className="text-[#666d80] dark:text-[#a3a3a3]">{restaurants.length} מסעדות</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-[#2563eb] rounded-full"></div>
              <span className="text-[#666d80] dark:text-[#a3a3a3]">{couriers.length} שליחים</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-[#16a34a] rounded-full"></div>
              <span className="text-[#666d80] dark:text-[#a3a3a3]">{orders.length} משלוחים</span>
            </div>
          </div>
        </div>
      </div>

      {/* בקרות זום */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-px bg-white dark:bg-[#262626] rounded-lg border-2 border-[rgba(0,0,0,0.2)] dark:border-[#404040] shadow-lg overflow-hidden">
        <button
          onClick={handleZoomIn}
          className="w-9 h-9 bg-white dark:bg-[#262626] hover:bg-[#f5f5f5] dark:hover:bg-[#404040] flex items-center justify-center border-b border-[#ccc] dark:border-[#404040] transition-colors text-black dark:text-white font-['Lucida_Console'] text-xl leading-none"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="w-9 h-9 bg-white dark:bg-[#262626] hover:bg-[#f5f5f5] dark:hover:bg-[#404040] flex items-center justify-center transition-colors text-black dark:text-white font-['Lucida_Console'] text-xl leading-none"
        >
          −
        </button>
      </div>

      {/* כפתור איפוס */}
      <button
        onClick={resetView}
        className="absolute left-4 bottom-24 z-10 px-3 py-1.5 bg-white/95 dark:bg-[#171717]/95 backdrop-blur-sm rounded-lg text-xs font-bold text-[#0d0d12] dark:text-[#fafafa] border border-[#e5e5e5] dark:border-[#262626] shadow-lg hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors"
      >
        אפס תצוגה
      </button>

      {/* המפה */}
      <div
        ref={containerRef}
        className="w-full h-full bg-[#ddd] dark:bg-[#171717] relative cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            position: 'relative',
            width: '1437px',
            height: '1304px',
          }}
        >
          {/* Map tiles */}
          {mapTiles.map((tile, idx) => (
            <div
              key={`tile-${idx}`}
              className="absolute"
              style={{
                left: `${tile.left}px`,
                top: `${tile.top}px`,
                width: '256px',
                height: '256px',
              }}
            >
              <img
                src={tile.img}
                alt=""
                className="w-full h-full object-cover pointer-events-none"
                draggable={false}
              />
            </div>
          ))}

          {/* מסעדות */}
          {restaurants.map((restaurant, idx) => {
            const isHovered = hoveredRestaurantName === restaurant.name;
            return (
              <div
                key={`restaurant-${idx}`}
                className="absolute"
                style={{
                  left: `${restaurant.lat * 14.37}px`,
                  top: `${restaurant.lng * 13.04}px`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: isHovered ? 20 : 10,
                }}
                onMouseEnter={() => onRestaurantHover?.(restaurant.name)}
                onMouseLeave={() => onRestaurantHover?.(null)}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isHovered ? 'scale-125' : 'scale-100'
                  }`}
                  style={{
                    backgroundColor: '#9333ea',
                    border: '3px solid white',
                    boxShadow: '0px 2px 8px 0px rgba(0,0,0,0.3)',
                  }}
                >
                  <div className="w-5 h-5">
                    <RestaurantIcon />
                  </div>
                </div>
                {isHovered && (
                  <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-white dark:bg-[#171717] px-2 py-1 rounded text-xs font-bold whitespace-nowrap shadow-lg border border-[#e5e5e5] dark:border-[#262626]">
                    {restaurant.name}
                  </div>
                )}
              </div>
            );
          })}

          {/* שליחים */}
          {couriers.map((courier) => {
            const isHovered = hoveredCourierId === courier.id;
            return (
              <div
                key={courier.id}
                className="absolute"
                style={{
                  left: `${courier.lat * 14.37}px`,
                  top: `${courier.lng * 13.04}px`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: isHovered ? 20 : 10,
                }}
                onMouseEnter={() => onCourierHover?.(courier.id)}
                onMouseLeave={() => onCourierHover?.(null)}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isHovered ? 'scale-125' : 'scale-100'
                  }`}
                  style={{
                    backgroundColor: '#2563eb',
                    border: '3px solid white',
                    boxShadow: '0px 2px 8px 0px rgba(0,0,0,0.3)',
                  }}
                >
                  <div className="w-5 h-5">
                    <CourierIcon />
                  </div>
                </div>
                {isHovered && (
                  <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-white dark:bg-[#171717] px-2 py-1 rounded text-xs font-bold whitespace-nowrap shadow-lg border border-[#e5e5e5] dark:border-[#262626]">
                    {courier.name}
                  </div>
                )}
              </div>
            );
          })}

          {/* משלוחים */}
          {orders.filter(o => o.status !== 'cancelled').map((order) => {
            const isSelected = selectedId === order.id;
            const isHovered = hoveredOrderId === order.id;
            const isDelivered = order.status === 'delivered';
            return (
              <div
                key={order.deliveryId}
                className="absolute"
                style={{
                  left: `${order.lat * 14.37}px`,
                  top: `${order.lng * 13.04}px`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: isSelected || isHovered ? 20 : 10,
                }}
                onMouseEnter={() => onOrderHover?.(order.id)}
                onMouseLeave={() => onOrderHover?.(null)}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isSelected || isHovered ? 'scale-125' : 'scale-100'
                  }`}
                  style={{
                    backgroundColor: '#16a34a',
                    border: `3px solid ${isSelected || isHovered ? '#ffeb3b' : 'white'}`,
                    boxShadow: '0px 2px 8px 0px rgba(0,0,0,0.3)',
                  }}
                >
                  <div className="w-5 h-5">
                    <DeliveredIcon />
                  </div>
                </div>
                {isHovered && (
                  <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-white dark:bg-[#171717] px-2 py-1 rounded text-xs font-bold whitespace-nowrap shadow-lg border border-[#e5e5e5] dark:border-[#262626]">
                    {order.customerName}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* סטטיסטיקות בתחתית */}
      <div className="absolute bottom-4 left-4 z-10 bg-[#171717] dark:bg-[#171717] rounded-xl p-3 border border-[#262626] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)]">
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex-1 text-[#a3a3a3]">מסעדות ({restaurants.length})</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <g clipPath="url(#clip0)">
                <path d={svgPaths.p36f21e80} stroke="#9810FA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                <path d={svgPaths.p2a594880} stroke="#9810FA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                <path d={svgPaths.p20b4ecc0} stroke="#9810FA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                <path d="M1.33333 4.66667H14.6667" stroke="#9810FA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                <path d={svgPaths.p4cbcae0} stroke="#9810FA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
              </g>
              <defs>
                <clipPath id="clip0">
                  <rect fill="white" height="16" width="16" />
                </clipPath>
              </defs>
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex-1 text-[#a3a3a3]">שליחים ({couriers.length})</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <g>
                <path d={svgPaths.p32887f80} stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                <path d={svgPaths.p3694d280} stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                <path d={svgPaths.p1f197700} stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                <path d={svgPaths.p3bf3e100} stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
              </g>
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex-1 text-[#a3a3a3]">לקוחות ({orders.length})</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <g>
                <path d={svgPaths.p399eca00} stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                <path d={svgPaths.pc93b400} stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* Leaflet attribution */}
      <div className="absolute bottom-1 left-auto right-1 z-10 bg-white/80 dark:bg-[rgba(255,255,255,0.8)] px-1 py-0.5 text-[10px] text-[#333]">
        <a href="https://leafletjs.com" className="text-[#0078a8]">Leaflet</a>
        {' | © '}
        <a href="https://www.openstreetmap.org" className="text-[#0078a8]">OpenStreetMap</a>
        {' © '}
        <a href="https://carto.com" className="text-[#0078a8]">CARTO</a>
      </div>
    </div>
  );
};
