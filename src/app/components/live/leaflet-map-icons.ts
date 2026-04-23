import L from 'leaflet';
import { getRestaurantBrandMarker } from '../../utils/restaurant-branding';

export const createRestaurantIcon = (size: number = 22, restaurantName?: string) => {
  const brandMarker = getRestaurantBrandMarker(restaurantName);

  if (brandMarker) {
    return L.divIcon({
      className: 'custom-marker restaurant-marker',
      html: `
        <div style="
          width: ${size}px;
          height: ${size}px;
          background-color: ${brandMarker.fill};
          border-radius: 5px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0.95;
          color: ${brandMarker.text};
          font-size: 13px;
          font-weight: 900;
          font-family: Arial, sans-serif;
          line-height: 1;
        ">${brandMarker.label}</div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

  return L.divIcon({
    className: 'custom-marker restaurant-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: #7c3aed;
        border-radius: 4px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0.85;
      ">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
          <path d="M7 2v20"/>
          <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

export const makeCourierIcon = (name: string, hasActiveDelivery: boolean, isOnShift: boolean = true) => {
  const firstName = name.split(' ')[0];
  const isDark = document.documentElement.classList.contains('dark');
  const labelTextColor = isDark ? '#fafafa' : '#1f2937';
  const labelBackground = isDark ? 'rgba(23,23,23,0.82)' : 'rgba(255,255,255,0.78)';
  const labelBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)';
  const labelShadow = isDark ? '0 1px 3px rgba(0,0,0,0.35)' : '0 1px 2px rgba(0,0,0,0.1)';
  const courierColor = !isOnShift ? '#64748b' : hasActiveDelivery ? '#f59e0b' : '#22c55e';
  const courierShadow = !isOnShift ? 'rgba(100,116,139,0.35)' : hasActiveDelivery ? 'rgba(245,158,11,0.5)' : 'rgba(34,197,94,0.45)';
  const labelOpacity = isOnShift ? '1' : '0.78';

  return L.divIcon({
    className: 'custom-marker courier-dot',
    html: `
      <div class="courier-marker-shell" style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
        <div class="courier-marker-core" style="
          width:14px;height:14px;
          background:${courierColor};
          border:2px solid white;
          border-radius:50%;
          box-shadow:0 1px 4px ${courierShadow};
        "></div>
        <div class="courier-marker-label" style="
          margin-top:3px;
          font-size:11px;
          font-family:'Rubik',sans-serif;
          font-weight:600;
          color:${labelTextColor};
          background:${labelBackground};
          border:${labelBorder};
          padding:2px 6px;
          border-radius:999px;
          white-space:nowrap;
          line-height:1.4;
          box-shadow:${labelShadow};
          backdrop-filter:blur(6px);
          opacity:${labelOpacity};
        ">${firstName}</div>
      </div>
    `,
    iconSize: [70, 32],
    iconAnchor: [35, 9],
  });
};

const makeSelectedOrderPin = (color: string, shadowColor: string) => L.divIcon({
  className: 'custom-marker order-pin selected-pin',
  html: `
    <div style="position:relative;width:26px;height:33px;display:flex;align-items:flex-start;justify-content:center;">
      <div style="
        width:22px;height:22px;
        background:radial-gradient(circle at center, transparent 0 6px, ${color} 6.5px 100%);
        border-radius:999px 999px 999px 6px;
        transform:rotate(-45deg);
        box-shadow:0 3px 8px ${shadowColor}, 0 0 0 2px rgba(15,205,211,0.16);
        opacity:0.9;
      "></div>
      <div style="
        position:absolute;
        top:-4px;right:-4px;
        width:13px;height:13px;
        background:#0fcdd3;
        border:1.5px solid white;
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 1px 3px rgba(0,0,0,0.3);
        z-index:1;
      ">
        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
    </div>`,
  iconSize: [26, 33],
  iconAnchor: [13, 29],
});

const makeOrderPin = (color: string, shadowColor: string) => L.divIcon({
  className: 'custom-marker order-pin',
  html: `
    <div style="position:relative;width:24px;height:30px;display:flex;align-items:flex-start;justify-content:center;">
      <div style="
        width:18px;height:18px;
        background:radial-gradient(circle at center, transparent 0 5px, ${color} 5.5px 100%);
        border-radius:999px 999px 999px 6px;
        transform:rotate(-45deg);
        box-shadow:0 2px 5px ${shadowColor};
        opacity:0.72;
      "></div>
    </div>`,
  iconSize: [24, 30],
  iconAnchor: [12, 25],
});

const pendingOrderIcon = makeOrderPin('#f97316', 'rgba(249,115,22,0.42)');
const assignedOrderIcon = makeOrderPin('#eab308', 'rgba(234,179,8,0.42)');
const deliveringOrderIcon = makeOrderPin('#6366f1', 'rgba(99,102,241,0.42)');
const deliveredOrderIcon = makeOrderPin('#16a34a', 'rgba(22,163,74,0.42)');
const cancelledOrderIcon = makeOrderPin('#ef4444', 'rgba(239,68,68,0.42)');

export const getOrderIcon = (status: string) => {
  if (status === 'pending') return pendingOrderIcon;
  if (status === 'assigned') return assignedOrderIcon;
  if (status === 'delivered') return deliveredOrderIcon;
  if (status === 'cancelled') return cancelledOrderIcon;
  return deliveringOrderIcon;
};

export const getSelectedOrderIcon = (status: string) => {
  if (status === 'pending') return makeSelectedOrderPin('#f97316', 'rgba(249,115,22,0.42)');
  if (status === 'assigned') return makeSelectedOrderPin('#eab308', 'rgba(234,179,8,0.42)');
  if (status === 'delivering') return makeSelectedOrderPin('#eab308', 'rgba(234,179,8,0.42)');
  if (status === 'delivered') return makeSelectedOrderPin('#16a34a', 'rgba(22,163,74,0.42)');
  if (status === 'cancelled') return makeSelectedOrderPin('#ef4444', 'rgba(239,68,68,0.42)');
  return makeSelectedOrderPin('#6366f1', 'rgba(99,102,241,0.42)');
};
