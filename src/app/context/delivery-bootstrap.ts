import {
  DayOfWeek,
  Customer,
  Courier,
  Delivery,
  DeliveryState,
  Restaurant,
  ShiftTemplate,
  WeeklyShiftDayConfig,
  WorkShift,
} from '../types/delivery.types';
import { getRestaurantChainId } from '../utils/restaurant-branding';

export const ISRAELI_NAMES = [
  'דוד כהן', 'משה לוי', 'יוסף מזרחי', 'אברהם אוחיון', 'שרה ביטון',
  'רחל פרץ', 'לאה אזולאי', 'רבקה עמר', 'דניאל מלכה', 'נועה שלום',
  'תמר בן דוד', 'מיכל גולן', 'יעל אבוטבול', 'עדי שמעון', 'רון חדד',
  'ליאור מועלם', 'עומר צדוק', 'אלון ברקת', 'גיא שרון', 'טל בנימין'
];

export const DEFAULT_RESTAURANT_PREPARATION_TIME = 5;
const DEFAULT_COURIER_VEHICLE_TYPE: Courier['vehicleType'] = 'אופנוע';
const DEFAULT_COURIER_EMPLOYMENT_TYPE: Courier['employmentType'] = 'פר משלוח';
export const DEFAULT_RESTAURANT_MAX_DELIVERY_TIME = 30;

const getDefaultPreparationTimeByType = (_type: string) => DEFAULT_RESTAURANT_PREPARATION_TIME;

const normalizeCourier = (courier: Courier): Courier => ({
  ...courier,
  vehicleType: courier.vehicleType ?? DEFAULT_COURIER_VEHICLE_TYPE,
  employmentType: courier.employmentType ?? DEFAULT_COURIER_EMPLOYMENT_TYPE,
});

export const normalizeCouriers = (couriers: Courier[]): Courier[] => couriers.map(normalizeCourier);

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

export const normalizeDeliveryPreparationTime = (
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

// Seed 24 couriers for the demo environment.
const generateCouriers = (): Courier[] => {
  const courierNames = [
    'יוני שליח', 'רועי משלוחים', 'עדן אקספרס', 'נועם דליברי', 'אורי מהיר',
    'דני רץ', 'תומר בדרכים', 'איתי אקספרס', 'אלון מהיר', 'גל שליחויות',
    'שי דליברי', 'עומר רץ', 'יובל משלוחים', 'לירון אקספרס', 'אדם שליח',
    'ניר שליח', 'רוני מהיר', 'מתן דליברי', 'עידו רץ', 'אביב משלוחים',
    'שחר אקספרס', 'נתן שליח', 'דור בדרכים', 'ערן מהיר'
  ];
  const vehicleTypes: Courier['vehicleType'][] = ['אופנוע', 'רכב', 'קורקינט'];
  
  // Keep seeded values deterministic so demo data stays stable between reloads.
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };
  
  const couriers: Courier[] = [];
  const employmentTypes: Courier['employmentType'][] = ['פר משלוח', 'שעתי'];
  
  for (let i = 0; i < 24; i++) {
    const phoneNumber = Math.floor(1000000 + seededRandom((i + 1) * 1000) * 9000000);
    const rating = 4.5 + seededRandom((i + 1) * 2000) * 0.5; // Rating between 4.5 and 5.0
    
    couriers.push({
      id: `c${i + 1}`,
      name: courierNames[i],
      phone: `050-${phoneNumber}`,
      vehicleType: vehicleTypes[i % vehicleTypes.length],
      employmentType: employmentTypes[i % employmentTypes.length],
      status: 'offline',
      isOnShift: false,
      shiftStartedAt: null,
      shiftEndedAt: null,
      currentShiftAssignmentId: null,
      activeDeliveryIds: [], // Start with no active deliveries.
      totalDeliveries: 0,
      rating: Math.round(rating * 10) / 10, // Round to one decimal place.
    });
  }
  
  return couriers;
};

const COURIERS_DATA: Courier[] = normalizeCouriers(generateCouriers());

// Seed restaurants with realistic addresses and locations.
const generateRestaurants = (): Restaurant[] => {
  // Realistic restaurant names, addresses, and coordinates across Gush Dan.
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
    {
      name: 'דומינו\'ס אבן גבירול',
      type: 'פיצה',
      city: 'תל אביב',
      street: 'אבן גבירול',
      streetNumber: 143,
      phone: '076-804-8974',
      lat: 32.0939,
      lng: 34.7818,
      rating: 4.5,
      totalOrders: 1185,
      avgTime: 23,
    },
    {
      name: 'דומינו\'ס הירקון כשר',
      type: 'פיצה',
      city: 'תל אביב',
      street: 'כ״ג יורדי הסירה',
      streetNumber: 10,
      phone: '076-804-8950',
      lat: 32.0972,
      lng: 34.7731,
      rating: 4.4,
      totalOrders: 960,
      avgTime: 24,
    },
    {
      name: 'דומינו\'ס יגאל אלון',
      type: 'פיצה',
      city: 'תל אביב',
      street: 'יגאל אלון',
      streetNumber: 90,
      phone: '076-804-8950',
      lat: 32.0695,
      lng: 34.7938,
      rating: 4.5,
      totalOrders: 1040,
      avgTime: 22,
    },
    {
      name: 'דומינו\'ס פלורנטין',
      type: 'פיצה',
      city: 'תל אביב',
      street: 'פלורנטין',
      streetNumber: 25,
      phone: '076-804-8950',
      lat: 32.0569,
      lng: 34.7699,
      rating: 4.6,
      totalOrders: 990,
      avgTime: 21,
    },
    {
      name: 'דומינו\'ס קרליבך',
      type: 'פיצה',
      city: 'תל אביב',
      street: 'קרליבך',
      streetNumber: 29,
      phone: '076-804-8950',
      lat: 32.0714,
      lng: 34.7801,
      rating: 4.5,
      totalOrders: 1015,
      avgTime: 22,
    },
    {
      name: 'דומינו\'ס רמת אביב',
      type: 'פיצה',
      city: 'תל אביב',
      street: 'טאגור',
      streetNumber: 30,
      phone: '076-804-8950',
      lat: 32.1147,
      lng: 34.7966,
      rating: 4.4,
      totalOrders: 870,
      avgTime: 24,
    },
    {
      name: 'דומינו\'ס רמת החייל',
      type: 'פיצה',
      city: 'תל אביב',
      street: 'ראול ולנברג',
      streetNumber: 24,
      phone: '076-804-8950',
      lat: 32.1104,
      lng: 34.8402,
      rating: 4.5,
      totalOrders: 930,
      avgTime: 23,
    },
  ];

  // Delivery generation defaults per restaurant type.
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

export const RESTAURANTS_DATA: Restaurant[] = normalizeRestaurants(generateRestaurants());

export const mergeSeededRestaurants = (restaurants: Restaurant[]): Restaurant[] => {
  const normalizedExisting = normalizeRestaurants(restaurants);
  const existingNames = new Set(
    normalizedExisting.map(restaurant => restaurant.name.trim().toLowerCase())
  );

  const missingSeededRestaurants = RESTAURANTS_DATA.filter(
    restaurant => !existingNames.has(restaurant.name.trim().toLowerCase())
  );

  return [...normalizedExisting, ...missingSeededRestaurants];
};

// Seed customers.
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
    
    const phonePrefix = Math.floor(seededRandom(i * 500) * 2); // 0 or 1
    const phoneNumber = Math.floor(1000000 + seededRandom(i * 600) * 9000000);
    
    const totalOrders = Math.floor(1 + seededRandom(i * 700) * 50); // 1-50 orders
    const averageOrderValue = Math.floor(30 + seededRandom(i * 800) * 70); // 30-100 ILS
    
    // Keep most customers active.
    const isActive = seededRandom(i * 900) < 0.85;
    
    // Last order date between today and 30 days back.
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

// Create a fresh initial state so reset never reuses mutated runtime references.
export const createInitialDeliveryState = (): DeliveryState => ({
  isSystemOpen: false,
  autoAssignEnabled: false, // Keep auto-assignment off while the system is closed.
  timeMultiplier: 1, // Real-time simulation speed.
  deliveries: [],
  couriers: COURIERS_DATA.map((courier) => ({ ...courier, activeDeliveryIds: [...courier.activeDeliveryIds] })),
  shiftTemplates: SHIFT_TEMPLATES.map((template) => ({
    ...template,
    slots: template.slots.map((slot) => ({ ...slot })),
  })),
  weeklyShiftConfig: WEEKLY_SHIFT_CONFIG.map((config) => ({
    ...config,
    templateIds: [...config.templateIds],
  })),
  shifts: buildInitialShifts(),
  restaurants: RESTAURANTS_DATA.map((restaurant) => ({ ...restaurant })),
  customers: CUSTOMERS_DATA.map((customer) => ({ ...customer })),
  activityLogs: [],
  deliveryBalance: 500,
  stats: {
    hour: { total: 0, delivered: 0, cancelled: 0, revenue: 0 },
    today: { total: 0, delivered: 0, cancelled: 0, revenue: 0 },
    week: { total: 0, delivered: 0, cancelled: 0, revenue: 0 },
    month: { total: 0, delivered: 0, cancelled: 0, revenue: 0 },
    year: { total: 0, delivered: 0, cancelled: 0, revenue: 0 },
  },
});

export const initialState: DeliveryState = createInitialDeliveryState();
