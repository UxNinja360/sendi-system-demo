import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const entry = `
import { createInitialDeliveryState } from './src/app/context/delivery-bootstrap';
import { deliveryReducer } from './src/app/context/delivery.reducer';
import { getCreditCostForAssignment } from './src/app/utils/delivery-credits';
import {
  DELIVERY_ASSIGNMENT_BLOCK_COPY,
  getDeliveryAssignmentBlockReason,
} from './src/app/utils/delivery-assignment';
import { isOperationalDelivery } from './src/app/utils/delivery-status';

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000);

const makeDelivery = (id, restaurant, overrides = {}) => {
  const createdAt = overrides.createdAt ?? new Date('2026-04-25T09:00:00.000Z');
  return {
    id,
    orderNumber: '#' + id,
    status: 'pending',
    priority: 1,
    comment: '',
    pack_num: '1',
    rest_id: restaurant.id,
    restaurantId: restaurant.id,
    rest_name: restaurant.name,
    restaurantName: restaurant.name,
    rest_city: restaurant.city,
    restaurantCity: restaurant.city,
    rest_street: restaurant.street,
    restaurantStreet: restaurant.street,
    pickup_latitude: restaurant.lat,
    pickup_longitude: restaurant.lng,
    restaurantAddress: restaurant.address,
    cook_time: restaurant.defaultPreparationTime,
    origin_cook_time: restaurant.defaultPreparationTime,
    preparationTime: restaurant.defaultPreparationTime,
    order_ready: false,
    reported_order_is_ready: false,
    rest_approve: false,
    rest_waits_for_cook_time: false,
    rest_last_eta: null,
    rest_approved_eta: null,
    client_id: 'client-' + id,
    client_name: 'Test Client',
    client_phone: '050-0000000',
    client_full_address: 'Dizengoff 1, Tel Aviv',
    client_city: 'Tel Aviv',
    client_street: 'Dizengoff',
    client_building: '1',
    dropoff_latitude: restaurant.lat + 0.01,
    dropoff_longitude: restaurant.lng + 0.01,
    runner_id: null,
    courierId: null,
    courierName: null,
    vehicle_type: 'אופנוע',
    area: 'Tel Aviv',
    creation_time: createdAt,
    createdAt,
    coupled_time: null,
    assignedAt: null,
    started_pickup: null,
    arrived_at_rest: null,
    arrivedAtRestaurantAt: null,
    took_it_time: null,
    pickedUpAt: null,
    started_dropoff: null,
    arrived_at_client: null,
    arrivedAtCustomerAt: null,
    delivered_time: null,
    deliveredAt: null,
    offerExpiresAt: overrides.offerExpiresAt ?? null,
    expiredAt: null,
    should_delivered_time: null,
    max_time_to_deliver: restaurant.maxDeliveryTime,
    maxDeliveryTime: restaurant.maxDeliveryTime,
    delivery_distance: 1.2,
    estimatedTime: 18,
    rest_price: 30,
    runner_price: 12,
    deliveryCreditConsumedAt: null,
    sum_cash: 0,
    is_cash: false,
    ...overrides,
  };
};

const assign = (state, deliveryId, courierId) =>
  deliveryReducer(state, {
    type: 'ASSIGN_COURIER',
    payload: {
      deliveryId,
      courierId,
      runner_at_assigning_latitude: 32.075,
      runner_at_assigning_longitude: 34.78,
    },
  });

let state = createInitialDeliveryState();
const restaurant = state.restaurants.find((item) => !item.chainId || item.chainId === '-')
  ?? state.restaurants[0];
const networkRestaurant = state.restaurants.find((item) => item.chainId && item.chainId !== '-')
  ?? state.restaurants[0];
const courier = state.couriers[0];

state = {
  ...state,
  deliveryBalance: 0,
  deliveries: [],
  couriers: state.couriers.map((item, index) => index === 0
    ? { ...item, status: 'available', isOnShift: true, activeDeliveryIds: [] }
    : { ...item, status: 'offline', isOnShift: false, activeDeliveryIds: [] }
  ),
};

state = deliveryReducer(state, { type: 'ADD_DELIVERY', payload: makeDelivery('regular-1', restaurant) });
let blocked = assign(state, 'regular-1', courier.id);
assert(blocked.deliveryBalance === 0, 'No-credit assignment changed balance');
assert(blocked.deliveries[0].status === 'pending', 'No-credit assignment changed delivery status');

const blockReason = getDeliveryAssignmentBlockReason(blocked.deliveries[0], {
  deliveryBalance: blocked.deliveryBalance,
  availableCourierCount: 1,
});
assert(blockReason === 'no_credits', 'Expected no_credits block reason');
assert(DELIVERY_ASSIGNMENT_BLOCK_COPY[blockReason] === 'אין מספיק יתרת משלוחים', 'No-credit copy mismatch');

state = { ...blocked, deliveryBalance: 1 };
state = assign(state, 'regular-1', courier.id);
const assignedRegular = state.deliveries.find((item) => item.id === 'regular-1');
assert(state.deliveryBalance === 0, 'Assignment did not consume exactly one credit');
assert(assignedRegular.status === 'assigned', 'Assignment did not set status assigned');
assert(assignedRegular.deliveryCreditConsumedAt instanceof Date, 'Assignment did not stamp credit consumption');
assert(getCreditCostForAssignment(assignedRegular) === 0, 'Consumed delivery should not cost another credit');
assert(assignedRegular.orderReadyTime.getTime() === addMinutes(assignedRegular.deliveryCreditConsumedAt, restaurant.defaultPreparationTime).getTime(), 'Prep timer did not start at assignment');
assert(assignedRegular.should_delivered_time.getTime() === addMinutes(assignedRegular.deliveryCreditConsumedAt, restaurant.maxDeliveryTime).getTime(), 'SLA timer did not start at assignment');

state = deliveryReducer(state, { type: 'CANCEL_DELIVERY', payload: 'regular-1' });
assert(state.deliveryBalance === 0, 'Cancelled assigned delivery refunded credit');
assert(state.deliveries.find((item) => item.id === 'regular-1').deliveryCreditConsumedAt instanceof Date, 'Cancelled assigned delivery lost credit stamp');

const oldCreatedAt = new Date('2026-04-25T09:00:00.000Z');
state = {
  ...state,
  deliveryBalance: 1,
  deliveries: [],
  couriers: state.couriers.map((item, index) => index === 0
    ? { ...item, status: 'available', isOnShift: true, activeDeliveryIds: [] }
    : item
  ),
};
state = deliveryReducer(state, { type: 'ADD_DELIVERY', payload: makeDelivery('network-expired', networkRestaurant, { createdAt: oldCreatedAt, creation_time: oldCreatedAt }) });
const pendingNetwork = state.deliveries.find((item) => item.id === 'network-expired');
assert(pendingNetwork.offerExpiresAt instanceof Date, 'Network delivery did not receive offer expiry');
assert(pendingNetwork.offerExpiresAt.getTime() === addMinutes(oldCreatedAt, 2).getTime(), 'Network offer expiry is not exactly two minutes');

state = deliveryReducer(state, { type: 'EXPIRE_DELIVERY_OFFERS', payload: addMinutes(oldCreatedAt, 3) });
const expiredNetwork = state.deliveries.find((item) => item.id === 'network-expired');
assert(expiredNetwork.status === 'expired', 'Expired network delivery did not become expired');
assert(expiredNetwork.expiredAt instanceof Date, 'Expired network delivery did not receive expiredAt');

const expiredBlockReason = getDeliveryAssignmentBlockReason(expiredNetwork, {
  deliveryBalance: state.deliveryBalance,
  availableCourierCount: 1,
  now: addMinutes(oldCreatedAt, 3),
});
assert(expiredBlockReason === 'offer_expired', 'Expected offer_expired block reason');
assert(!isOperationalDelivery(expiredNetwork), 'Expired delivery should not count as operational');

const beforeExpiredAssignBalance = state.deliveryBalance;
state = assign(state, 'network-expired', courier.id);
assert(state.deliveryBalance === beforeExpiredAssignBalance, 'Expired delivery assignment consumed credit');
assert(state.deliveries.find((item) => item.id === 'network-expired').status === 'expired', 'Expired delivery assignment changed status');

export const results = [
  'no credits hard-block assignment',
  'assignment consumes one credit',
  'cancel after assignment does not refund credit',
  'network offer expires after two minutes',
  'expired offer cannot be assigned',
  'expired offer is excluded from operational delivery counts',
  'prep and SLA timers start at assignment',
];
`;

const tempDir = await mkdtemp(path.join(tmpdir(), 'sendi-business-rules-'));
const bundledFile = path.join(tempDir, 'verify.mjs');

try {
  await build({
    stdin: {
      contents: entry,
      sourcefile: 'verify-delivery-business-rules.ts',
      resolveDir: process.cwd(),
      loader: 'ts',
    },
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: bundledFile,
    logLevel: 'silent',
  });

  const originalLog = console.log;
  const originalWarn = console.warn;
  let module;
  try {
    console.log = () => {};
    console.warn = () => {};
    module = await import(pathToFileURL(bundledFile).href);
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }

  const output = [
    'Sendi business rules verification passed:',
    ...module.results.map((item) => '  - ' + item),
  ].join('\n');
  console.log(output);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
