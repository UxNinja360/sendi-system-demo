import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import {
  DayOfWeek,
  DeliveryState,
  DeliveryAction,
  Delivery,
  Courier,
  Restaurant,
  Customer,
  ShiftTemplate,
  WeeklyShiftDayConfig,
  WorkShift,
} from '../types/delivery.types';
import { deliveryReducer } from './delivery.reducer';
import { getRestaurantChainId } from '../utils/restaurant-branding';

// ×©×ž×•×ª ×™×©×¨××œ×™× ×œ×“×ž×•
const ISRAELI_NAMES = [
  'דוד כהן', 'משה לוי', 'יוסף מזרחי', 'אברהם אוחיון', 'שרה ביטון',
  'רחל פרץ', 'לאה אזולאי', 'רבקה עמר', 'דניאל מלכה', 'נועה שלום',
  'תמר בן דוד', 'מיכל גולן', 'יעל אבוטבול', 'עדי שמעון', 'רון חדד',
  'ליאור מועלם', 'עומר צדוק', 'אלון ברקת', 'גיא שרון', 'טל בנימין'
];

const AREAS = ['תל אביב', 'רמת גן', 'גבעתיים', 'בני ברק', 'חולון', 'בת ים'];

const DEFAULT_RESTAURANT_PREPARATION_TIME = 5;
const DEFAULT_COURIER_VEHICLE_TYPE: Courier['vehicleType'] = 'אופנוע';
const DEFAULT_RESTAURANT_MAX_DELIVERY_TIME = 30;

const getDefaultPreparationTimeByType = (_type: string) => DEFAULT_RESTAURANT_PREPARATION_TIME;

const normalizeCourier = (courier: Courier): Courier => ({
  ...courier,
  vehicleType: courier.vehicleType ?? DEFAULT_COURIER_VEHICLE_TYPE,
});

const normalizeCouriers = (couriers: Courier[]): Courier[] => couriers.map(normalizeCourier);

const normalizeRestaurant = (restaurant: Restaurant): Restaurant => ({
  ...restaurant,
  chainId: restaurant.chainId || getRestaurantChainId(restaurant.name),
  defaultPreparationTime:
    typeof restaurant.defaultPreparationTime === 'number' && restaurant.defaultPreparationTime > 0
      ? restaurant.defaultPreparationTime
      : DEFAULT_RESTAURANT_PREPARATION_TIME,
  maxDeliveryTime:
    typeof restaurant.maxDeliveryTime === 'number' && restaurant.maxDeliveryTime > 0
      ? restaurant.maxDeliveryTime === 60
        ? DEFAULT_RESTAURANT_MAX_DELIVERY_TIME
        : restaurant.maxDeliveryTime
      : DEFAULT_RESTAURANT_MAX_DELIVERY_TIME,
});

const normalizeRestaurants = (restaurants: Restaurant[]): Restaurant[] =>
  restaurants.map(normalizeRestaurant);

const getRestaurantPreparationTimeForDelivery = (
  delivery: Partial<Delivery>,
  restaurants: Restaurant[],
) => {
  const restaurant = restaurants.find(
    item => item.id === delivery.restaurantId || item.name === delivery.restaurantName || item.id === delivery.rest_id || item.name === delivery.rest_name
  );
  return restaurant?.defaultPreparationTime ?? DEFAULT_RESTAURANT_PREPARATION_TIME;
};

const getRestaurantMaxDeliveryTimeForDelivery = (
  delivery: Partial<Delivery>,
  restaurants: Restaurant[],
) => {
  const restaurant = restaurants.find(
    item => item.id === delivery.restaurantId || item.name === delivery.restaurantName || item.id === delivery.rest_id || item.name === delivery.rest_name
  );
  return restaurant?.maxDeliveryTime ?? DEFAULT_RESTAURANT_MAX_DELIVERY_TIME;
};

const normalizeDeliveryPreparationTime = (
  delivery: Delivery,
  restaurants: Restaurant[],
): Delivery => {
  const restaurantPreparationTime = getRestaurantPreparationTimeForDelivery(delivery, restaurants);
  const restaurantMaxDeliveryTime = getRestaurantMaxDeliveryTimeForDelivery(delivery, restaurants);
  const currentPreparationTime =
    typeof delivery.preparationTime === 'number' && delivery.preparationTime > 0
      ? delivery.preparationTime
      : typeof delivery.cook_time === 'number' && delivery.cook_time > 0
        ? delivery.cook_time
        : restaurantPreparationTime;
  const originalPreparationTime =
    typeof delivery.origin_cook_time === 'number' && delivery.origin_cook_time > 0
      ? delivery.origin_cook_time
      : typeof delivery.cook_time === 'number' && delivery.cook_time > 0
        ? delivery.cook_time
        : currentPreparationTime;
  const createdAt = new Date(delivery.createdAt ?? delivery.creation_time ?? new Date());
  const packCount = (() => {
    if (typeof delivery.pack_num === 'number' && Number.isFinite(delivery.pack_num)) {
      return Math.min(3, Math.max(1, Math.round(delivery.pack_num)));
    }
    if (typeof delivery.pack_num === 'string') {
      const parsed = parseInt(delivery.pack_num, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return Math.min(3, Math.max(1, parsed));
      }
    }
    return 1;
  })();

  return {
    ...delivery,
    preparationTime: currentPreparationTime,
    cook_time: currentPreparationTime,
    origin_cook_time: originalPreparationTime,
    pack_num: String(packCount),
    orderReadyTime:
      delivery.orderReadyTime ?? new Date(createdAt.getTime() + currentPreparationTime * 60000),
    rest_last_eta:
      delivery.rest_last_eta ?? new Date(createdAt.getTime() + currentPreparationTime * 60000),
    rest_approved_eta:
      delivery.rest_approved_eta ?? new Date(createdAt.getTime() + currentPreparationTime * 60000),
    maxDeliveryTime:
      typeof delivery.maxDeliveryTime === 'number' && delivery.maxDeliveryTime > 0
        ? delivery.maxDeliveryTime
        : typeof delivery.max_time_to_deliver === 'number' && delivery.max_time_to_deliver > 0
          ? delivery.max_time_to_deliver
          : restaurantMaxDeliveryTime,
    max_time_to_deliver:
      typeof delivery.max_time_to_deliver === 'number' && delivery.max_time_to_deliver > 0
        ? delivery.max_time_to_deliver
        : typeof delivery.maxDeliveryTime === 'number' && delivery.maxDeliveryTime > 0
          ? delivery.maxDeliveryTime
          : restaurantMaxDeliveryTime,
    should_delivered_time:
      delivery.should_delivered_time ??
      new Date(createdAt.getTime() + restaurantMaxDeliveryTime * 60000),
  };
};

// ×™×¦×™×¨×ª 24 ×©×œ×™×—×™× (×ž×¡×¤×¨ ×¨×™××œ×™×¡×˜×™ ×™×•×ª×¨)
const generateCouriers = (): Courier[] => {
  const courierNames = [
    'יוני שליח', 'רועי משלוחים', 'עדן אקספרס', 'נועם דליברי', 'אורי מהיר',
    'דני רץ', 'תומר בדרכים', 'איתי אקספרס', 'אלון מהיר', 'גל שליחויות',
    'שי דליברי', 'עומר רץ', 'יובל משלוחים', 'לירון אקספרס', 'אדם שליח',
    'ניר שליח', 'רוני מהיר', 'מתן דליברי', 'עידו רץ', 'אביב משלוחים',
    'שחר אקספרס', 'נתן שליח', 'דור בדרכים', 'ערן מהיר'
  ];
  const vehicleTypes: Courier['vehicleType'][] = ['אופנוע', 'רכב', 'קורקינט'];
  
  // Seeded random ×ž×‘×˜×™×— ×©×”×“××˜×” ×ª×”×™×” ×–×”×” ×‘×›×œ ×˜×¢×™× ×” ×©×œ ×”××¤×œ×™×§×¦×™×”
  // ×–×” ×ž××¤×©×¨ ×¢×§×‘×™×•×ª ×‘× ×ª×•× ×™× ×œ×¦×•×¨×›×™ ×“×ž×• ×•×‘×“×™×§×•×ª
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };
  
  const couriers: Courier[] = [];
  
  for (let i = 0; i < 24; i++) {
    const phoneNumber = Math.floor(1000000 + seededRandom((i + 1) * 1000) * 9000000);
    const rating = 4.5 + seededRandom((i + 1) * 2000) * 0.5; // ×“×™×¨×•×’ ×‘×™×Ÿ 4.5 ×œ-5.0
    
    couriers.push({
      id: `c${i + 1}`,
      name: courierNames[i],
      phone: `050-${phoneNumber}`,
      vehicleType: vehicleTypes[i % vehicleTypes.length],
      status: 'offline',
      isOnShift: false,
      shiftStartedAt: null,
      shiftEndedAt: null,
      currentShiftAssignmentId: null,
      activeDeliveryIds: [], // ×ž×¢×¨×š ×¨×™×§ - ××™×Ÿ ×ž×©×œ×•×—×™× ×¤×¢×™×œ×™× ×‘×”×ª×—×œ×”
      totalDeliveries: 0,
      rating: Math.round(rating * 10) / 10, // ×¢×™×’×•×œ ×œ×¡×¤×¨×” ××—×ª ××—×¨×™ ×”× ×§×•×“×”
    });
  }
  
  return couriers;
};

const COURIERS_DATA: Courier[] = normalizeCouriers(generateCouriers());

// ×™×¦×™×¨×ª 10 ×ž×¡×¢×“×•×ª
const generateRestaurants = (): Restaurant[] => {
  // 10 ×ž×¡×¢×“×•×ª ×¢× × ×ª×•× ×™× ××ž×™×ª×™×™× - ×©×ž×•×ª, ×›×ª×•×‘×•×ª ×•×§×•××•×¨×“×™× ×˜×•×ª ×ž×“×•×™×§×•×ª ×‘×’×•×© ×“×Ÿ
  const restaurantData: Array<{
    name: string;
    type: string;
    city: string;
    street: string;
    streetNumber: number;
    phone: string;
    lat: number;
    lng: number;
    rating: number;
    totalOrders: number;
    avgTime: number;
  }> = [
    {
      name: 'פיצה שמש',
      type: 'פיצה',
      city: 'תל אביב',
      street: 'דיזנגוף',
      streetNumber: 164,
      phone: '03-5221478',
      lat: 32.0785,
      lng: 34.7740,
      rating: 4.6,
      totalOrders: 823,
      avgTime: 25,
    },
    {
      name: 'בורגר סלון',
      type: 'המבורגר',
      city: 'תל אביב',
      street: 'שדרות רוטשילד',
      streetNumber: 34,
      phone: '03-6881234',
      lat: 32.0630,
      lng: 34.7750,
      rating: 4.8,
      totalOrders: 612,
      avgTime: 30,
    },
    {
      name: 'סושי קו',
      type: 'סושי',
      city: 'תל אביב',
      street: 'אבן גבירול',
      streetNumber: 101,
      phone: '03-5469988',
      lat: 32.0850,
      lng: 34.7835,
      rating: 4.7,
      totalOrders: 445,
      avgTime: 35,
    },
    {
      name: 'טרטוריה',
      type: 'איטלקי',
      city: 'תל אביב',
      street: 'נחלת בנימין',
      streetNumber: 21,
      phone: '03-5107676',
      lat: 32.0640,
      lng: 34.7705,
      rating: 4.5,
      totalOrders: 378,
      avgTime: 40,
    },
    {
      name: 'הדרקון הזהב',
      type: 'סיני',
      city: 'תל אביב',
      street: 'הירקון',
      streetNumber: 67,
      phone: '03-5223344',
      lat: 32.0740,
      lng: 34.7670,
      rating: 4.3,
      totalOrders: 290,
      avgTime: 35,
    },
    {
      name: 'באנג בנגקוק',
      type: 'תאילנדי',
      city: 'יפו',
      street: 'שדרות ירושלים',
      streetNumber: 4,
      phone: '03-6823355',
      lat: 32.0530,
      lng: 34.7580,
      rating: 4.4,
      totalOrders: 195,
      avgTime: 30,
    },
    {
      name: 'טנדורי',
      type: 'הודי',
      city: 'רמת גן',
      street: 'ביאליק',
      streetNumber: 23,
      phone: '03-7511234',
      lat: 32.0840,
      lng: 34.8090,
      rating: 4.2,
      totalOrders: 310,
      avgTime: 45,
    },
    {
      name: 'בוריטו לוקו',
      type: 'מקסיקני',
      city: 'תל אביב',
      street: 'פלורנטין',
      streetNumber: 33,
      phone: '03-5601122',
      lat: 32.0560,
      lng: 34.7700,
      rating: 4.6,
      totalOrders: 520,
      avgTime: 20,
    },
    {
      name: 'הים התיכון',
      type: 'ים תיכוני',
      city: 'תל אביב',
      street: 'נמל תל אביב',
      streetNumber: 12,
      phone: '03-5441199',
      lat: 32.0970,
      lng: 34.7720,
      rating: 4.9,
      totalOrders: 680,
      avgTime: 45,
    },
    {
      name: 'אל גאוצ׳ו',
      type: 'בשרים',
      city: 'רמת גן',
      street: 'ז׳בוטינסקי',
      streetNumber: 7,
      phone: '03-7529988',
      lat: 32.0810,
      lng: 34.8000,
      rating: 4.7,
      totalOrders: 410,
      avgTime: 50,
    },
    {
      name: 'מקדונלד\'ס דיזנגוף סנטר',
      type: 'המבורגר',
      city: 'תל אביב',
      street: 'דיזנגוף',
      streetNumber: 50,
      phone: '052-9440013',
      lat: 32.075455,
      lng: 34.775559,
      rating: 4.6,
      totalOrders: 1380,
      avgTime: 21,
    },
    {
      name: 'מקדונלד\'ס ויצמן סנטר',
      type: 'המבורגר',
      city: 'תל אביב',
      street: 'ויצמן',
      streetNumber: 14,
      phone: '052-9440104',
      lat: 32.081429,
      lng: 34.790011,
      rating: 4.5,
      totalOrders: 1125,
      avgTime: 20,
    },
    {
      name: 'מקדונלד\'ס לונדון מיניסטור',
      type: 'המבורגר',
      city: 'תל אביב',
      street: 'אבן גבירול',
      streetNumber: 30,
      phone: '052-9440012',
      lat: 32.075317,
      lng: 34.7819712,
      rating: 4.5,
      totalOrders: 1060,
      avgTime: 22,
    },
    {
      name: 'מקדונלד\'ס רוטשילד',
      type: 'המבורגר',
      city: 'תל אביב',
      street: 'שדרות רוטשילד',
      streetNumber: 33,
      phone: '052-9440166',
      lat: 32.065411,
      lng: 34.776706,
      rating: 4.4,
      totalOrders: 980,
      avgTime: 23,
    },
    {
      name: 'מקדונלד\'ס עזריאלי',
      type: 'המבורגר',
      city: 'תל אביב',
      street: 'דרך מנחם בגין',
      streetNumber: 132,
      phone: '052-9440053',
      lat: 32.0754583,
      lng: 34.7919028,
      rating: 4.6,
      totalOrders: 1240,
      avgTime: 20,
    },
    {
      name: 'מקדונלד\'ס מיקדו סנטר',
      type: 'המבורגר',
      city: 'תל אביב',
      street: 'אהרון בקר',
      streetNumber: 8,
      phone: '052-9440083',
      lat: 32.1231514,
      lng: 34.8164041,
      rating: 4.4,
      totalOrders: 860,
      avgTime: 21,
    },
    {
      name: 'מקדונלד\'ס מחלף הסירה',
      type: 'המבורגר',
      city: 'הרצליה',
      street: 'אבא אבן',
      streetNumber: 1,
      phone: '052-9440015',
      lat: 32.161039,
      lng: 34.8104033,
      rating: 4.5,
      totalOrders: 915,
      avgTime: 22,
    },
    {
      name: 'מקדונלד\'ס רוטשילד פתח תקווה',
      type: 'המבורגר',
      city: 'פתח תקווה',
      street: 'רוטשילד',
      streetNumber: 182,
      phone: '052-9440080',
      lat: 32.07576,
      lng: 34.8853014,
      rating: 4.4,
      totalOrders: 830,
      avgTime: 24,
    },
    {
      name: 'מקדונלד\'ס וולפסון',
      type: 'המבורגר',
      city: 'חולון',
      street: 'הלוחמים',
      streetNumber: 62,
      phone: '052-9440107',
      lat: 32.0362763,
      lng: 34.762087,
      rating: 4.3,
      totalOrders: 770,
      avgTime: 23,
    },
    {
      name: 'מקדונלד\'ס קניון הזהב',
      type: 'המבורגר',
      city: 'ראשון לציון',
      street: 'דוד סחרוב',
      streetNumber: 21,
      phone: '052-9440201',
      lat: 31.9902482,
      lng: 34.7741438,
      rating: 4.5,
      totalOrders: 1180,
      avgTime: 22,
    },
    {
      name: 'מקדונלד\'ס יס פלאנט ראשון',
      type: 'המבורגר',
      city: 'ראשון לציון',
      street: 'המאה ועשרים',
      streetNumber: 4,
      phone: '052-9440202',
      lat: 31.9793425,
      lng: 34.7466794,
      rating: 4.5,
      totalOrders: 940,
      avgTime: 24,
    },
  ];

  // ×¤×•× ×§×¦×™×” ×©×ž×—×–×™×¨×” ××ª ×”×’×“×¨×•×ª ×”×ž×¡×¢×“×” ×œ×¤×™ ×¡×•×’
  const getRestaurantConfig = (type: string) => {
    switch(type) {
      case 'פיצה':
        return { deliveryRate: 1, deliveryInterval: 6, maxDeliveriesPerHour: 10 };
      case 'המבורגר':
        return { deliveryRate: 1, deliveryInterval: 6, maxDeliveriesPerHour: 10 };
      case 'סושי':
        return { deliveryRate: 1, deliveryInterval: 6, maxDeliveriesPerHour: 10 };
      case 'איטלקי':
        return { deliveryRate: 1, deliveryInterval: 12, maxDeliveriesPerHour: 5 };
      case 'סיני':
      case 'תאילנדי':
      case 'מקסיקני':
      case 'ים תיכוני':
      case 'בשרים':
      case 'הודי':
        return { deliveryRate: 1, deliveryInterval: 20, maxDeliveriesPerHour: 3 };
      default:
        return { deliveryRate: 1, deliveryInterval: 20, maxDeliveriesPerHour: 3 };
    }
  };

  return restaurantData.map((r, i) => {
    const config = getRestaurantConfig(r.type);
    return {
      id: `r${i + 1}`,
      name: r.name,
      chainId: getRestaurantChainId(r.name),
      type: r.type,
      phone: r.phone,
      address: `${r.street} ${r.streetNumber}, ${r.city}`,
      city: r.city,
      street: `${r.street} ${r.streetNumber}`,
      lat: r.lat,
      lng: r.lng,
      rating: r.rating,
      isActive: false,
      totalOrders: r.totalOrders,
      averageDeliveryTime: r.avgTime,
      defaultPreparationTime: getDefaultPreparationTimeByType(r.type),
      maxDeliveryTime: DEFAULT_RESTAURANT_MAX_DELIVERY_TIME,
      deliveryRate: config.deliveryRate,
      deliveryInterval: config.deliveryInterval,
      maxDeliveriesPerHour: config.maxDeliveriesPerHour,
    };
  });
};

const RESTAURANTS_DATA: Restaurant[] = normalizeRestaurants(generateRestaurants());

// ×™×¦×™×¨×ª ×œ×§×•×—×•×ª
const generateCustomers = (): Customer[] => {
  const customerNames = [
    'דוד כהן', 'משה לוי', 'יוסף מזרחי', 'אברהם אוחיון', 'שרה ביטון',
    'רחל פרץ', 'לאה אזולאי', 'רבקה עמר', 'דניאל מלכה', 'נועה שלום',
    'תמר בן דוד', 'מיכל גולן', 'יעל אבוטבול', 'עדי שמעון', 'רון חדד',
    'ליאור מועלם', 'עומר צדוק', 'אלון ברקת', 'גיא שרון', 'טל בנימין',
    'אביבה ישראל', 'אלה דהן', 'חנה בוזגלו', 'ורד שושן', 'גלית זהבי',
    'אור סלומון', 'עדן טל', 'שני רז', 'מור קדוש', 'לי אור'
  ];
  
  const cities = ['תל אביב', 'רמת גן', 'גבעתיים', 'בני ברק', 'חולון', 'בת ים', 'רמת השרון', 'הרצליה'];
  
  const streets = [
    'הצל', 'רוטשילד', 'דיזנגוף', 'בן יהודה', 'אלנבי', 'בן גוריון',
    'ויצמן', 'ז׳בוטינסקי', 'ביאליק', 'אחד העם', 'נורדאו', 'יהודה הלוי'
  ];

  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };
  
  const customers: Customer[] = [];
  
  for (let i = 1; i <= 30; i++) {
    const name = customerNames[i - 1];
    const city = cities[Math.floor(seededRandom(i * 200) * cities.length)];
    const street = streets[Math.floor(seededRandom(i * 300) * streets.length)];
    const streetNumber = Math.floor(1 + seededRandom(i * 400) * 200);
    
    const phonePrefix = Math.floor(seededRandom(i * 500) * 2); // 0 ××• 1
    const phoneNumber = Math.floor(1000000 + seededRandom(i * 600) * 9000000);
    
    const totalOrders = Math.floor(1 + seededRandom(i * 700) * 50); // 1-50 ×”×–×ž× ×•×ª
    const averageOrderValue = Math.floor(30 + seededRandom(i * 800) * 70); // 30-100 â‚ª
    
    // 85% ×œ×§×•×—×•×ª ×¤×¢×™×œ×™×
    const isActive = seededRandom(i * 900) < 0.85;
    
    // ×ª××¨×™×š ×”×–×ž× ×” ××—×¨×•× ×” - ×‘×™×Ÿ ×”×™×•× ×œ-30 ×™×ž×™× ××—×•×¨×”
    const daysAgo = Math.floor(seededRandom(i * 1000) * 30);
    const lastOrderDate = new Date();
    lastOrderDate.setDate(lastOrderDate.getDate() - daysAgo);
    
    customers.push({
      id: `cu${i}`,
      name: name,
      phone: `05${phonePrefix}-${phoneNumber}`,
      address: `${street} ${streetNumber}, ${city}`,
      totalOrders: totalOrders,
      lastOrderDate: isActive ? lastOrderDate : null,
      averageOrderValue: averageOrderValue,
      status: isActive ? 'active' : 'inactive',
    });
  }
  
  return customers;
};

const CUSTOMERS_DATA: Customer[] = generateCustomers();

const SHIFT_TEMPLATES: ShiftTemplate[] = [];

const WEEKLY_SHIFT_CONFIG: WeeklyShiftDayConfig[] = [
  { dayOfWeek: 0, isClosed: false, templateIds: [] },
  { dayOfWeek: 1, isClosed: false, templateIds: [] },
  { dayOfWeek: 2, isClosed: false, templateIds: [] },
  { dayOfWeek: 3, isClosed: false, templateIds: [] },
  { dayOfWeek: 4, isClosed: false, templateIds: [] },
  { dayOfWeek: 5, isClosed: false, templateIds: [] },
  { dayOfWeek: 6, isClosed: false, templateIds: [] },
];

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;

const startOfWeek = (date: Date) => {
  const next = new Date(date);
  const day = next.getDay();
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - day);
  return next;
};

const buildInitialShifts = (): WorkShift[] => {
  const weekStart = startOfWeek(new Date());
  const configMap = new Map(WEEKLY_SHIFT_CONFIG.map((config) => [config.dayOfWeek, config]));
  const templateMap = new Map(SHIFT_TEMPLATES.map((template) => [template.id, template]));
  const shifts: WorkShift[] = [];

  for (let index = 0; index < 7; index += 1) {
    const current = new Date(weekStart);
    current.setDate(weekStart.getDate() + index);
    const dayKey = toDateKey(current);
    const config = configMap.get(current.getDay() as DayOfWeek);

    if (!config || config.isClosed) continue;

    config.templateIds.forEach((templateId) => {
      const template = templateMap.get(templateId);
      if (!template) return;

      shifts.push({
        id: `shift-${dayKey}-${templateId}`,
        templateId,
        name: template.name,
        date: dayKey,
        startTime: template.startTime,
        endTime: template.endTime,
        requiredCouriers: template.slots.length,
        type: template.type,
        status: 'planned',
        courierAssignments: [],
        createdAt: new Date(),
      });
    });
  }

  return shifts;
};

// State ×”×ª×—×œ×ª×™
const initialState: DeliveryState = {
  isSystemOpen: false,
  autoAssignEnabled: false, // ×›×‘×•×™ ×›×‘×¨×™×¨×ª ×ž×—×“×œ ×›×©×”×ž×¢×¨×›×ª ×¡×’×•×¨×”
  timeMultiplier: 1, // ×–×ž×Ÿ ××ž×ª - x1
  deliveries: [],
  couriers: COURIERS_DATA,
  shiftTemplates: SHIFT_TEMPLATES,
  weeklyShiftConfig: WEEKLY_SHIFT_CONFIG,
  shifts: buildInitialShifts(),
  restaurants: RESTAURANTS_DATA,
  customers: CUSTOMERS_DATA,
  deliveryBalance: 500, // יתרת משלוחים התחלתית - 500 משלוחים
  stats: {
    hour: { total: 0, delivered: 0, cancelled: 0, revenue: 0 },
    today: { total: 0, delivered: 0, cancelled: 0, revenue: 0 },
    week: { total: 0, delivered: 0, cancelled: 0, revenue: 0 },
    month: { total: 0, delivered: 0, cancelled: 0, revenue: 0 },
    year: { total: 0, delivered: 0, cancelled: 0, revenue: 0 },
  },
};

const STORAGE_KEY = 'sendi-delivery-state';
const LIVE_MANAGER_ON_SHIFT_ONLY_STORAGE_KEY = 'sendi-live-manager-on-shift-only';
const LIVE_MANAGER_ROUTE_STOP_ORDERS_STORAGE_KEY = 'sendi-live-manager-route-stop-orders';
const LIVE_MANAGER_COURIER_POSITIONS_STORAGE_KEY = 'sendi-live-manager-courier-positions';

const reviveDates = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(reviveDates);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, reviveDates(entry)])
    );
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return new Date(value);
  }

  return value;
};

const getStoredCourierAssignPosition = (
  courierId: string,
): { runner_at_assigning_latitude?: number; runner_at_assigning_longitude?: number } => {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(LIVE_MANAGER_COURIER_POSITIONS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, { lat?: number; lng?: number }>;
    const position = parsed?.[courierId];
    if (!position) return {};

    return {
      runner_at_assigning_latitude:
        typeof position.lat === 'number' ? position.lat : undefined,
      runner_at_assigning_longitude:
        typeof position.lng === 'number' ? position.lng : undefined,
    };
  } catch {
    return {};
  }
};

const createAssignCourierPayload = (deliveryId: string, courierId: string) => ({
  deliveryId,
  courierId,
  ...getStoredCourierAssignPosition(courierId),
});

const loadInitialState = (baseState: DeliveryState): DeliveryState => {
  if (typeof window === 'undefined') return baseState;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return baseState;

    const parsed = reviveDates(JSON.parse(raw)) as Partial<DeliveryState>;

    const restaurants = normalizeRestaurants(
      (parsed.restaurants as Restaurant[] | undefined) ?? baseState.restaurants
    );
    const couriers = normalizeCouriers(
      (parsed.couriers as Courier[] | undefined) ?? baseState.couriers
    );

    return {
      ...baseState,
      ...parsed,
      couriers,
      restaurants,
      deliveries: ((parsed.deliveries as Delivery[] | undefined) ?? baseState.deliveries).map(delivery =>
        normalizeDeliveryPreparationTime(delivery, restaurants)
      ),
      stats: {
        ...baseState.stats,
        ...parsed.stats,
      },
    };
  } catch (error) {
    console.warn('Failed to load persisted delivery state', error);
    return baseState;
  }
};

// Context Type
interface DeliveryContextType {
  state: DeliveryState;
  dispatch: React.Dispatch<DeliveryAction>;
  toggleSystem: () => void;
  assignCourier: (deliveryId: string, courierId: string) => void;
  cancelDelivery: (deliveryId: string) => void;
  unassignCourier: (deliveryId: string) => void;
  updateDelivery: (deliveryId: string, updates: Partial<Delivery>) => void;
  resetSystem: () => void;
  addCourier: (courier: Courier) => void;
  removeCourier: (courierId: string) => void;
  addDeliveryBalance: (amount: number) => void;
}

const DeliveryContext = createContext<DeliveryContextType | undefined>(undefined);

// Provider
export const DeliveryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(deliveryReducer, initialState, loadInitialState);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to persist delivery state', error);
    }
  }, [state]);
  
  // ×ª×™×§×•×Ÿ ××•×˜×•×ž×˜×™ ×©×œ ×ž×¡×¢×“×•×ª ×œ× ×¤×¢×™×œ×•×ª - ×¨×§ ×¤×¢× ××—×ª ×‘×”×ª×—×œ×”
  // ×”×•×¡×¨ - ×ž×ª×—×™×œ×™× ×¢× 0 ×ž×¡×¢×“×•×ª ×¤×¢×™×œ×•×ª
  // useEffect(() => {
  //   const activeRestaurants = state.restaurants.filter(r => r.isActive);
  //   if (activeRestaurants.length === 0) {
  //     console.warn('ðŸ”§ ×ž×ª×§×Ÿ ×ž×¡×¢×“×•×ª ×œ× ×¤×¢×™×œ×•×ª - ×ž×¤×¢×™×œ ××ª ×›×•×œ×Ÿ...');
  //     // ××™×Ÿ ×ž×¡×¢×“×•×ª ×¤×¢×™×œ×•×ª - ×¦×¨×™×š ×œ×ª×§×Ÿ ××ª ×–×”
  //     const fixedRestaurants = state.restaurants.map(r => ({ ...r, isActive: true }));
  //     dispatch({ type: 'SET_RESTAURANTS', payload: fixedRestaurants });
  //   }
  // }, []); // ×¨×§ ×¤×¢× ××—×ª ×‘×”×ª×—×œ×”
  
  // ×ž×•× ×” ×œ×ž×©×œ×•×—×™× - ×œ×”×‘×˜×™×— ×™×™×—×•×“×™×•×ª ×©×œ ID
  const deliveryCounter = useRef(0);

  // ×¤×•× ×§×¦×™×” ×œ×™×¦×™×¨×ª ID ×§×‘×•×¢ ×œ×ž×¡×¢×“×” ×‘×”×ª×‘×¡×¡ ×¢×œ ×©×ž×”
  const getRestaurantId = (restaurantName: string): string => {
    // ×—×™×¤×•×© ×‘×ž×¡×¢×“×•×ª ×”×§×™×™×ž×•×ª ×‘×ž×¢×¨×›×ª
    const restaurant = RESTAURANTS_DATA.find(r => r.name === restaurantName);
    if (restaurant) {
      return restaurant.id;
    }
    
    // fallback - ×™×¦×™×¨×ª hash ×× ×”×ž×¡×¢×“×” ×œ× × ×ž×¦××” (×œ× ××ž×•×¨ ×œ×§×¨×•×ª)
    let hash = 0;
    for (let i = 0; i < restaurantName.length; i++) {
      const char = restaurantName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `r${Math.abs(hash % 100) + 1}`;
  };

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // ×¨×©×™×ž×ª ×›×ª×•×‘×•×ª ××ž×™×ª×™×•×ª ×‘×’×•×© ×“×Ÿ ×¢× ×§×•××•×¨×“×™× ×˜×•×ª GPS ×ž×“×•×™×§×•×ª
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const REAL_ADDRESSES = [
    { address: 'דיזנגוף 22, תל אביב', city: 'תל אביב', street: 'דיזנגוף', building: '22', lat: 32.0700, lng: 34.7735, area: 'מרכז תל אביב' },
    { address: 'דיזנגוף 55, תל אביב', city: 'תל אביב', street: 'דיזנגוף', building: '55', lat: 32.0725, lng: 34.7733, area: 'מרכז תל אביב' },
    { address: 'דיזנגוף 99, תל אביב', city: 'תל אביב', street: 'דיזנגוף', building: '99', lat: 32.0752, lng: 34.7731, area: 'מרכז תל אביב' },
    { address: 'שדרות רוטשילד 12, תל אביב', city: 'תל אביב', street: 'שדרות רוטשילד', building: '12', lat: 32.0617, lng: 34.7723, area: 'מרכז תל אביב' },
    { address: 'שדרות רוטשילד 50, תל אביב', city: 'תל אביב', street: 'שדרות רוטשילד', building: '50', lat: 32.0635, lng: 34.7753, area: 'מרכז תל אביב' },
    { address: 'בן יהודה 44, תל אביב', city: 'תל אביב', street: 'בן יהודה', building: '44', lat: 32.0718, lng: 34.7669, area: 'מרכז תל אביב' },
    { address: 'בן יהודה 105, תל אביב', city: 'תל אביב', street: 'בן יהודה', building: '105', lat: 32.0765, lng: 34.7662, area: 'מרכז תל אביב' },
    { address: 'אלנבי 20, תל אביב', city: 'תל אביב', street: 'אלנבי', building: '20', lat: 32.0660, lng: 34.7726, area: 'מרכז תל אביב' },
    { address: 'הירקון 88, תל אביב', city: 'תל אביב', street: 'הירקון', building: '88', lat: 32.0760, lng: 34.7643, area: 'חוף תל אביב' },
    { address: 'אבן גבירול 65, תל אביב', city: 'תל אביב', street: 'אבן גבירול', building: '65', lat: 32.0775, lng: 34.7838, area: 'מרכז תל אביב' },
    { address: 'פלורנטין 22, תל אביב', city: 'תל אביב', street: 'פלורנטין', building: '22', lat: 32.0646, lng: 34.7742, area: 'פלורנטין' },
    { address: 'נחלת בנימין 35, תל אביב', city: 'תל אביב', street: 'נחלת בנימין', building: '35', lat: 32.0649, lng: 34.7698, area: 'נחלת בנימין' },
    { address: 'נמל תל אביב 18, תל אביב', city: 'תל אביב', street: 'נמל תל אביב', building: '18', lat: 32.0864, lng: 34.7781, area: 'נמל תל אביב' },
    { address: 'ביאליק 14, רמת גן', city: 'רמת גן', street: 'ביאליק', building: '14', lat: 32.0836, lng: 34.7882, area: 'מרכז רמת גן' },
    { address: 'ז׳בוטינסקי 38, רמת גן', city: 'רמת גן', street: 'ז׳בוטינסקי', building: '38', lat: 32.0834, lng: 34.8096, area: 'מרכז רמת גן' },
    { address: 'הרא״ה 42, רמת גן', city: 'רמת גן', street: 'הרא״ה', building: '42', lat: 32.0783, lng: 34.8088, area: 'מרכז רמת גן' },
    { address: 'קריניצי 22, רמת גן', city: 'רמת גן', street: 'קריניצי', building: '22', lat: 32.0808, lng: 34.8050, area: 'מרכז רמת גן' },
    { address: 'ויצמן 25, גבעתיים', city: 'גבעתיים', street: 'ויצמן', building: '25', lat: 32.0700, lng: 34.8135, area: 'מרכז גבעתיים' },
    { address: 'שדרות בן גוריון 12, גבעתיים', city: 'גבעתיים', street: 'שדרות בן גוריון', building: '12', lat: 32.0713, lng: 34.8143, area: 'מרכז גבעתיים' },
    { address: 'דרך השלום 20, בני ברק', city: 'בני ברק', street: 'דרך השלום', building: '20', lat: 32.0842, lng: 34.8335, area: 'מרכז בני ברק' },
    { address: 'רבי עקיבא 10, בני ברק', city: 'בני ברק', street: 'רבי עקיבא', building: '10', lat: 32.0846, lng: 34.8345, area: 'מרכז בני ברק' },
    { address: 'שדרות ירושלים 8, יפו', city: 'יפו', street: 'שדרות ירושלים', building: '8', lat: 32.0118, lng: 34.7772, area: 'יפו' },
    { address: 'יפת 14, יפו', city: 'יפו', street: 'יפת', building: '14', lat: 32.0175, lng: 34.7783, area: 'יפו' },
    { address: 'העלייה 12, בת ים', city: 'בת ים', street: 'העלייה', building: '12', lat: 32.0258, lng: 34.7523, area: 'בת ים' },
    { address: 'בלפור 18, בת ים', city: 'בת ים', street: 'בלפור', building: '18', lat: 32.0230, lng: 34.7535, area: 'בת ים' },
  ];

  const generateDelivery = useCallback((restaurant: Restaurant): Delivery | null => {
    deliveryCounter.current += 1;
    const id = `D${Date.now()}-${deliveryCounter.current}-${Math.random().toString(36).substr(2, 9)}`;
    const orderNumber = `#${Math.floor(10000 + Math.random() * 90000)}`;
    const apiShortOrderId = `${Math.floor(100000 + Math.random() * 900000)}`;
    
    const customerName = ISRAELI_NAMES[Math.floor(Math.random() * ISRAELI_NAMES.length)];
    const price = Math.floor(15 + Math.random() * 35); // 15-50 â‚ª

    // ×‘×—×™×¨×ª ×›×ª×•×‘×ª ×œ×§×•×— ××ž×™×ª×™×ª
    const customerAddr = REAL_ADDRESSES[Math.floor(Math.random() * REAL_ADDRESSES.length)];
    const area = customerAddr.area;

    // ×ž×¦×™××ª ×”×ž×¡×¢×“×” ×›×“×™ ×œ×§×‘×œ ×§×•××•×¨×“×™× ×˜×•×ª ××ž×™×ª×™×•×ª
    const restaurantName = restaurant.name;
    const pickupLat = restaurant.lat || 32.0853;
    const pickupLng = restaurant.lng || 34.7818;
    const restStreet = restaurant.street ?? restaurantName;
    const restCity = restaurant.city ?? 'תל אביב';
    const restAddress = restaurant.address ?? `${restStreet}, ${restCity}`;

    const now = new Date();
    // ×–×ž×Ÿ ×”×’×¢×” ×ž×©×•×¢×¨ ×œ×ž×¡×¢×“×”: 5-15 ×“×§×•×ª ×ž×¢×›×©×™×•
    const estimatedRestaurantTime = new Date(now.getTime() + (5 + Math.random() * 10) * 60000);
    // ×–×ž×Ÿ ×”×’×¢×” ×ž×©×•×¢×¨ ×œ×œ×§×•×—: 20-40 ×“×§×•×ª ×ž×¢×›×©×™×•
    const estimatedCustomerTime = new Date(now.getTime() + (20 + Math.random() * 20) * 60000);

    const restPrice = Math.floor(price * 0.7); // 70% ×ž×”×ž×—×™×¨ ×œ×œ×§×•×—
    const runnerPrice = Math.floor(price * 0.3); // 30% ×œ×©×œ×™×—
    const cookTime = restaurant.defaultPreparationTime ?? DEFAULT_RESTAURANT_PREPARATION_TIME;
    const maxDeliveryTime = restaurant.maxDeliveryTime ?? DEFAULT_RESTAURANT_MAX_DELIVERY_TIME;

    return {
      // ========================================
      // 1. âš™ï¸ Core Entity
      // ========================================
      id,
      api_short_order_id: apiShortOrderId,
      api_str_order_id: `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      priority: Math.floor(Math.random() * 3), // 0-2
      is_api: Math.random() > 0.5,
      is_started: false,
      is_approved: Math.random() > 0.3,
      is_requires_approval: Math.random() > 0.7,
      close_order: false,
      comment: Math.random() > 0.7 ? 'הערת מערכת' : undefined,
      pack_num: `${1 + Math.floor(Math.random() * 3)}`,
      
      // ========================================
      // 2. ðŸª Origin / Spawner
      // ========================================
      rest_id: restaurant.id,
      branch_id: Math.random() > 0.7 ? `BR${Math.floor(1 + Math.random() * 5)}` : undefined,
      rest_name: restaurantName,
      rest_city: restCity,
      rest_street: restStreet,
      rest_building: restaurant?.street?.split(' ').pop() ?? '',
      pickup_latitude: pickupLat,
      pickup_longitude: pickupLng,
      cook_type: ['רגיל', 'מהיר', 'איטי'][Math.floor(Math.random() * 3)],
      cook_time: cookTime,
      origin_cook_time: cookTime,
      order_ready: Math.random() > 0.5,
      reported_order_is_ready: Math.random() > 0.6,
      rest_approve: Math.random() > 0.4,
      rest_waits_for_cook_time: Math.random() > 0.5,
      rest_last_eta: Math.random() > 0.5 ? new Date(now.getTime() + cookTime * 60000) : null,
      rest_approved_eta: Math.random() > 0.6 ? new Date(now.getTime() + cookTime * 60000) : null,
      is_drinks_exist: Math.random() > 0.6,
      is_sauces_exist: Math.random() > 0.5,
      
      // ========================================
      // 3. ðŸŽ¯ Target / Client
      // ========================================
      client_id: `cu${Math.floor(1 + Math.random() * 30)}`,
      client_name: customerName,
      client_phone: `050-${Math.floor(1000000 + Math.random() * 9000000)}`,
      client_full_address: customerAddr.address,
      client_city: customerAddr.city,
      client_street: customerAddr.street,
      client_building: customerAddr.building,
      client_entry: Math.random() > 0.6 ? `${String.fromCharCode(65 + Math.floor(Math.random() * 4))}` : undefined,
      client_floor: Math.random() > 0.5 ? `${Math.floor(Math.random() * 10)}` : undefined,
      client_apartment: Math.random() > 0.5 ? `${Math.floor(1 + Math.random() * 20)}` : undefined,
      zipcode: `${Math.floor(1000000 + Math.random() * 9000000)}`,
      dropoff_latitude: customerAddr.lat,
      dropoff_longitude: customerAddr.lng,
      client_comment: Math.random() > 0.7 ? 'אנא לצלצל כשמגיעים' : undefined,
      wrong_address: Math.random() > 0.95,
      client_agree_to_place: Math.random() > 0.8,
      signature_url: undefined,
      
      // ========================================
      // 4. ðŸš´ Actor / Runner
      // ========================================
      runner_id: null,
      pending_runner_id: undefined,
      shift_runner_id: undefined,
      arrived_at_rest_runner_id: undefined,
      vehicle_type: ['אופניים', 'קורקינט', 'אופנוע', 'רכב'][Math.floor(Math.random() * 4)],
      algo_runner: Math.random() > 0.5,
      coupled_by: undefined,
      runner_at_assigning_latitude: undefined,
      runner_at_assigning_longitude: undefined,
      is_orbit_start: Math.random() > 0.7,
      area,
      area_id: `area${Math.floor(1 + Math.random() * 5)}`,
      delivery_area_id: `da${Math.floor(1 + Math.random() * 10)}`,
      main_polygon_name: ['מרכז', 'צפון', 'דרום', 'מזרח', 'מערב'][Math.floor(Math.random() * 5)],
      
      // ========================================
      // 5. â±ï¸ Timeline / Events
      // ========================================
      creation_time: now,
      delivery_date: new Date(now.getTime() + (20 + Math.random() * 20) * 60000),
      push_time: Math.random() > 0.5 ? new Date(now.getTime() + Math.random() * 60000) : undefined,
      coupled_time: null,
      started_pickup: null,
      arrived_at_rest: null,
      took_it_time: null,
      started_dropoff: null,
      arrived_at_client: null,
      delivered_time: null,
      
      // ========================================
      // 6. ðŸ“Š Mechanics & SLA
      // ========================================
      should_delivered_time: new Date(now.getTime() + maxDeliveryTime * 60000),
      max_time_to_deliver: maxDeliveryTime,
      min_time_to_suplly: Math.floor(15 + Math.random() * 10),
      max_time_to_suplly: Math.floor(30 + Math.random() * 15),
      minutes_late: 0,
      pickup_deviation: 0,
      dropoff_deviation: 0,
      delay_reason: undefined,
      delay_duration: 0,
      delivery_distance: Math.floor(1 + Math.random() * 10), // 1-10 ×§"×ž
      duration_to_client: Math.floor(15 + Math.random() * 30),
      eta_after_pickup: Math.floor(10 + Math.random() * 20),
      suplly_status: ['ממתין', 'בהכנה', 'מוכן'][Math.floor(Math.random() * 3)],
      
      // ========================================
      // 7. ðŸ’° Economy / Finances
      // ========================================
      rest_price: restPrice,
      rest_polygon_price: Math.random() > 0.5 ? restPrice : undefined,
      runner_price: runnerPrice,
      runner_tip: Math.random() > 0.7 ? Math.floor(5 + Math.random() * 15) : undefined,
      sum_cash: price,
      is_cash: Math.random() > 0.5,
      
      // ========================================
      // 8. ðŸ“¡ Meta & Feedback
      // ========================================
      api_type: Math.random() > 0.5 ? 'REST' : 'WEBHOOK',
      api_source: ['Website', 'App', 'Phone', 'Wolt', 'TenBis'][Math.floor(Math.random() * 5)],
      source_platform: ['iOS', 'Android', 'Web', 'Desktop'][Math.floor(Math.random() * 4)],
      website_id: Math.random() > 0.6 ? `WEB${Math.floor(100 + Math.random() * 900)}` : undefined,
      comax_id: Math.random() > 0.7 ? `CMX${Math.floor(1000 + Math.random() * 9000)}` : undefined,
      parent_mishloha_order_id: undefined,
      associated_api_order_id: undefined,
      associated_short_api_order_id: undefined,
      sms_status: ['sent', 'pending', 'failed'][Math.floor(Math.random() * 3)],
      sms_code: `${Math.floor(1000 + Math.random() * 9000)}`,
      tracker_viewed: Math.random() > 0.5,
      runner_took_comment: undefined,
      runner_delivered_comment: undefined,
      client_runner_rank: undefined,
      client_remark: undefined,
      feedback_status: undefined,
      feedback_first_answer: undefined,
      feedback_second_answer: undefined,
      feedback_third_answer: undefined,
      
      // ========================================
      // Legacy/Compatibility Fields
      // ========================================
      orderNumber,
      restaurantId: getRestaurantId(restaurantName),
      restaurantName,
      restaurantAddress: restAddress,
      restaurantCity: restCity,
      restaurantStreet: restStreet,
      branchName: Math.random() > 0.7 ? `סניף ${Math.floor(1 + Math.random() * 5)}` : undefined,
      customerName,
      customerPhone: `050-${Math.floor(1000000 + Math.random() * 9000000)}`,
      address: customerAddr.address,
      customerCity: customerAddr.city,
      customerStreet: customerAddr.street,
      customerBuilding: customerAddr.building,
      price,
      restaurantPrice: restPrice,
      commissionAmount: price - restPrice,
      courierPayment: runnerPrice,
      courierId: null,
      courierName: undefined,
      courierEmploymentType: undefined,
      courierRating: undefined,
      createdAt: now,
      assignedAt: null,
      pickedUpAt: null,
      deliveredAt: null,
      arrivedAtRestaurantAt: null,
      arrivedAtCustomerAt: null,
      estimatedTime: Math.floor(15 + Math.random() * 30),
      estimatedArrivalAtRestaurant: estimatedRestaurantTime,
      estimatedArrivalAtCustomer: estimatedCustomerTime,
      orderReadyTime: Math.random() > 0.5 ? new Date(now.getTime() + cookTime * 60000) : null,
      reportedOrderIsReady: Math.random() > 0.6,
      preparationTime: cookTime,
      maxDeliveryTime: maxDeliveryTime,
      cancelledAt: null,
      cancelledAfterPickup: false,
      orderPriority: Math.floor(Math.random() * 3),
      customerRating: undefined,
      customerFeedback: undefined,
      customerFeedbackQuestion1: undefined,
      customerFeedbackQuestion2: undefined,
      customerFeedbackQuestion3: undefined,
      deliveryNotes: Math.random() > 0.7 ? 'הערת מערכת' : undefined,
      orderNotes: Math.random() > 0.7 ? 'אנא לצלצל כשמגיעים' : undefined,
    };
  }, []);

  // ×ž× ×’× ×•×Ÿ: ×›×œ ×ž×¡×¢×“×” ×¤×¢×™×œ×” ×™×•×¦×¨×ª ×ž×©×œ×•×—×™× ×‘×§×¦×‘ ×©×œ×”
  // ×—×©×•×‘: ×œ× ×ª×œ×•×™ ×‘-deliveryBalance ×›×“×™ ×œ× ×œ×™×¦×•×¨ ×ž×—×“×© ××ª ×”-intervals ×‘×›×œ ×ž×©×œ×•×— ×©× ×•×¦×¨
  const deliveryBalanceRef = useRef(state.deliveryBalance);
  useEffect(() => { deliveryBalanceRef.current = state.deliveryBalance; }, [state.deliveryBalance]);

  useEffect(() => {
    if (!state.isSystemOpen) return;

    const activeRestaurants = state.restaurants.filter(r => r.isActive);
    if (activeRestaurants.length === 0) return;

    const intervals: NodeJS.Timeout[] = [];

    // ×¢×‘×•×¨ ×›×œ ×ž×¡×¢×“×” ×¤×¢×™×œ×”, ×¦×•×¨ interval ×ž×©×œ×”
    activeRestaurants.forEach(restaurant => {
      // ×™×¦×™×¨×ª ×ž×©×œ×•×—/×™× ×ž×™×™×“×™×ª (××—×¨×™ 1-3 ×©× ×™×•×ª)
      const initialDelay = (Math.random() * 2000 + 1000) / state.timeMultiplier;

      const spawn = () => {
        if (deliveryBalanceRef.current <= 0) return;
        for (let i = 0; i < restaurant.deliveryRate; i++) {
          const newDelivery = generateDelivery(restaurant);
          if (newDelivery) {
            dispatch({ type: 'ADD_DELIVERY', payload: newDelivery });
          }
        }
      };

      const initialTimeout = setTimeout(spawn, initialDelay);
      intervals.push(initialTimeout);

      // interval ×§×‘×•×¢ ×œ×¤×™ deliveryInterval ×©×œ ×”×ž×¡×¢×“×”
      const intervalMs = (restaurant.deliveryInterval * 60 * 1000) / state.timeMultiplier;
      const interval = setInterval(spawn, intervalMs);
      intervals.push(interval);
    });

    return () => {
      intervals.forEach(timer => {
        clearInterval(timer);
        clearTimeout(timer);
      });
    };
  }, [state.isSystemOpen, state.restaurants, state.timeMultiplier, generateDelivery, dispatch]);

  // ×¦×•×•×ª×™× ××•×˜×•×ž×˜×™ (××•×¤×¦×™×•× ×œ×™ - × ×™×ª×Ÿ ×œ×”×¡×™×¨ ×× ×¨×•×¦×™× ×¦×•×•×ª×™× ×™×“× ×™ ×‘×œ×‘×“)
  useEffect(() => {
    if (!state.autoAssignEnabled) return;

    const interval = setInterval(() => {
      // ×ž×¦× ×ž×©×œ×•×— ×ž×ž×ª×™×Ÿ
      const pendingDelivery = state.deliveries.find(d => d.status === 'pending');
      // ×ž×¦× ×©×œ×™×— ×™×›×•×œ ×œ×§×‘×œ ×ž×©×œ×•×— × ×•×¡×£ (×¤×—×•×ª ×ž-2 ×ž×©×œ×•×—×™× ×¤×¢×™×œ×™×)
      const availableCourier = state.couriers.find(c => 
        c.status !== 'offline' && c.isOnShift && c.activeDeliveryIds.length < 2
      );

      if (pendingDelivery && availableCourier) {
        dispatch({
          type: 'ASSIGN_COURIER',
          payload: createAssignCourierPayload(pendingDelivery.id, availableCourier.id),
        });
      }
    }, 500); // ×‘×“×•×§ ×›×œ ×—×¦×™ ×©× ×™×™×” - ×©×™×‘×•×¥ ×ž×™×™×“×™!

    return () => clearInterval(interval);
  }, [state.autoAssignEnabled, state.deliveries, state.couriers]);

  // ×¦×•×•×ª ×•×”×©×œ× ×ž×©×œ×•×—×™× ×ž×ž×ª×™× ×™× ×›×©×”×ž×¢×¨×›×ª ×¡×’×•×¨×” ×•×©×™×‘×•×¥ ××•×˜×•×ž×˜×™ ×¤×¢×™×œ
  useEffect(() => {
    if (state.isSystemOpen || !state.autoAssignEnabled) return;

    const interval = setInterval(() => {
      // ×ž×¦× ×ž×©×œ×•×— ×ž×ž×ª×™×Ÿ
      const pendingDelivery = state.deliveries.find(d => d.status === 'pending');
      
      if (pendingDelivery) {
        // ×ž×¦× ×©×œ×™×— ×™×›×•×œ ×œ×§×‘×œ ×ž×©×œ×•×— × ×•×¡×£ (×¤×—×•×ª ×ž-2 ×ž×©×œ×•×—×™× ×¤×¢×™×œ×™×)
        const availableCourier = state.couriers.find(c => 
          c.status !== 'offline' && c.isOnShift && c.activeDeliveryIds.length < 2
        );
        
        if (availableCourier) {
          dispatch({
            type: 'ASSIGN_COURIER',
            payload: createAssignCourierPayload(pendingDelivery.id, availableCourier.id),
          });
        }
      }
    }, 3000); // ×‘×“×•×§ ×›×œ 3 ×©× ×™×•×ª

    return () => clearInterval(interval);
  }, [state.isSystemOpen, state.autoAssignEnabled, state.deliveries, state.couriers]);

  // ×”×ª×§×“×ž×•×ª ×©×œ×‘×™× ××•×˜×•×ž×˜×™×ª - ×ž×ž×©×™×›×” ×’× ×›×©×”×ž×¢×¨×›×ª ×¡×’×•×¨×”
  useEffect(() => {
    const interval = setInterval(() => {
      state.deliveries.forEach(delivery => {
        const now = new Date();
        
        // ×™×¦×™×¨×ª ×–×ž×Ÿ ×ž×©×•×§×œ×œ ×œ×›×œ ×ž×©×œ×•×— ×¢×œ ×¤×™ ×”-ID ×©×œ×•
        const deliveryHash = delivery.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const seed = (deliveryHash % 1000) / 1000; // 0.0-1.0

        // ×¤×•× ×§×¦×™×” ×œ×—×™×©×•×‘ ×–×ž×Ÿ ×ž×©×œ×•×— ×ž×©×•×§×œ×œ
        const getWeightedDeliveryTime = (baseSeed: number) => {
          // 15% ×¡×™×›×•×™ ×œ×ž×©×œ×•×— ×ž×”×™×¨ (3-5 ×“×§×•×ª)
          if (baseSeed < 0.15) {
            const quickSeed = (deliveryHash % 200) / 200;
            return 3 + quickSeed * 2; // 3-5 ×“×§×•×ª
          }
          
          // 85% ×”× ×•×ª×¨×™× - ×ž×©×œ×•×—×™× ×¨×’×™×œ×™× (5-28 ×“×§×•×ª)
          const remaining = (baseSeed - 0.15) / 0.85;
          const skewed = Math.pow(remaining, 1.5);
          return 5 + skewed * 23; // 5-28 ×“×§×•×ª
        };

        const totalDeliveryMinutes = getWeightedDeliveryTime(seed);
        
        // ×—×œ×•×§×”: 40% ×œ×ž×¡×¢×“×”, 60% ×œ×œ×§×•×—
        const timeToRestaurantSeconds = totalDeliveryMinutes * 0.4 * 60; // ×‘×©× ×™×•×ª
        const timeToCustomerSeconds = totalDeliveryMinutes * 0.6 * 60; // ×‘×©× ×™×•×ª

        if (delivery.status === 'assigned' && delivery.assignedAt) {
          const pickupStartedAt = delivery.started_pickup ?? delivery.assignedAt;
          const timeSinceAssigned = (now.getTime() - pickupStartedAt.getTime()) / 1000;
          if (timeSinceAssigned >= timeToRestaurantSeconds) {
            dispatch({
              type: 'UPDATE_STATUS',
              payload: {
                deliveryId: delivery.id,
                status: 'delivering',
              },
            });
          }
        }

        // ×× ×”×©×œ×™×— ×”×’×™×¢ ×œ×ž×¡×¢×“×” ×•×”×”×–×ž× ×” ×”×™×ª×” ××”××ª× ×” ×ž×¡×¤×™×§ ×–×ž×Ÿ, ×”×•× ×™×•×¦× ×œ×œ×§×•×—

        // ×× × ××¡×£ ××• ×™×¦× ×œ×œ×§×•×—, ×¡×™×™× ××—×¨×™ ×–×ž×Ÿ ×”× ×¡×™×¢×”
        const isHeadingToCustomer =
          delivery.status === 'delivering' && delivery.started_dropoff;
        if (isHeadingToCustomer) {
          const timeSincePickup = (now.getTime() - delivery.started_dropoff!.getTime()) / 1000;
          if (timeSincePickup >= timeToCustomerSeconds) {
            dispatch({
              type: 'COMPLETE_DELIVERY',
              payload: delivery.id,
            });
          }
        }
      });
    }, 1000); // ×‘×“×•×§ ×›×œ ×©× ×™×™×”

    return () => clearInterval(interval);
  }, [state.deliveries, state.timeMultiplier]); // ×”×•×¡×¨×” ×”×ª×œ×•×ª ×‘-isSystemOpen ×›×“×™ ×©×™×¢×‘×•×“ ×’× ×›×©×”×ž×¢×¨×›×ª ×¡×’×•×¨×”

  const toggleSystem = () => {
    dispatch({ type: 'TOGGLE_SYSTEM' });
  };

  const assignCourier = (deliveryId: string, courierId: string) => {
    dispatch({
      type: 'ASSIGN_COURIER',
      payload: createAssignCourierPayload(deliveryId, courierId),
    });
  };

  const cancelDelivery = (deliveryId: string) => {
    dispatch({ type: 'CANCEL_DELIVERY', payload: deliveryId });
  };

  const unassignCourier = (deliveryId: string) => {
    dispatch({ type: 'UNASSIGN_COURIER', payload: deliveryId });
  };

  const updateDelivery = (deliveryId: string, updates: Partial<Delivery>) => {
    dispatch({ type: 'UPDATE_DELIVERY', payload: { deliveryId, updates } });
  };

  const resetSystem = () => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(LIVE_MANAGER_ON_SHIFT_ONLY_STORAGE_KEY);
        window.localStorage.removeItem(LIVE_MANAGER_ROUTE_STOP_ORDERS_STORAGE_KEY);
        window.localStorage.removeItem(LIVE_MANAGER_COURIER_POSITIONS_STORAGE_KEY);
      } catch (error) {
        console.warn('Failed to clear persisted delivery state', error);
      }
    }

    dispatch({ type: 'RESET_SYSTEM', payload: initialState });

    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const addCourier = (courier: Courier) => {
    dispatch({ type: 'ADD_COURIER', payload: courier });
  };

  const removeCourier = (courierId: string) => {
    dispatch({ type: 'REMOVE_COURIER', payload: courierId });
  };

  const addDeliveryBalance = (amount: number) => {
    dispatch({ type: 'ADD_DELIVERY_BALANCE', payload: amount });
  };

  return (
    <DeliveryContext.Provider
      value={{
        state,
        dispatch,
        toggleSystem,
        assignCourier,
        cancelDelivery,
        unassignCourier,
        updateDelivery,
        resetSystem,
        addCourier,
        removeCourier,
        addDeliveryBalance,
      }}
    >
      {children}
    </DeliveryContext.Provider>
  );
};

// Hook ×œ×©×™×ž×•×© ×‘-Context
export const useDelivery = () => {
  const context = useContext(DeliveryContext);
  if (context === undefined) {
    throw new Error('useDelivery must be used within a DeliveryProvider');
  }
  return context;
};
