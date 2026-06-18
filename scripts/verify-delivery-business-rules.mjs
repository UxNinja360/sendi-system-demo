import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const entry = `
import { createInitialDeliveryState } from './src/app/context/delivery-bootstrap';
import { deliveryReducer } from './src/app/context/delivery.reducer';
import {
  getCreditCostForAssignment,
  getCreditCostForDeliveryIntake,
} from './src/app/utils/delivery-credits';
import {
  DELIVERY_ASSIGNMENT_BLOCK_COPY,
  getDeliveryAssignmentBlockReason,
} from './src/app/utils/delivery-assignment';
import {
  isOperationalDelivery,
  isVisibleInDefaultDeliveriesView,
} from './src/app/utils/delivery-status';
import { canCourierAcceptDelivery } from './src/app/utils/courier-assignment';
import { isSendiPlusRestaurant } from './src/app/utils/sendi-plus';

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
const sendiPlusRestaurant = state.restaurants.find((item) =>
  isSendiPlusRestaurant(item.name, item.chainId)
) ?? networkRestaurant;
const courier = state.couriers[0];

const allCouriersOfflineState = {
  ...state,
  isSystemOpen: false,
  couriers: state.couriers.map((item) => ({
    ...item,
    status: 'offline',
    isOnShift: false,
    activeDeliveryIds: [],
  })),
};
const openedWithoutCouriers = deliveryReducer(allCouriersOfflineState, { type: 'TOGGLE_SYSTEM' });
assert(openedWithoutCouriers.isSystemOpen, 'System did not open without active couriers');
const intakeWithoutCouriers = deliveryReducer(openedWithoutCouriers, { type: 'TOGGLE_DELIVERY_INTAKE' });
assert(!intakeWithoutCouriers.isReceivingDeliveries, 'Delivery intake turned on without connected couriers');
const connectedCourierIntakeState = {
  ...openedWithoutCouriers,
  couriers: openedWithoutCouriers.couriers.map((item, index) => index === 0
    ? { ...item, status: 'available', isOnShift: true, activeDeliveryIds: [] }
    : item
  ),
};
const intakeWithConnectedCourier = deliveryReducer(connectedCourierIntakeState, { type: 'TOGGLE_DELIVERY_INTAKE' });
assert(intakeWithConnectedCourier.isReceivingDeliveries, 'Delivery intake did not turn on with a connected courier');
const intakeAfterWaitingDelivery = deliveryReducer(intakeWithConnectedCourier, {
  type: 'ADD_DELIVERY',
  payload: makeDelivery('waiting-no-couriers', restaurant),
});
assert(intakeAfterWaitingDelivery.isReceivingDeliveries, 'Delivery intake turned off while a delivery waited for couriers');
assert(intakeAfterWaitingDelivery.deliveries.length === 1, 'Waiting delivery was not accepted without active couriers');

state = {
  ...state,
  deliveryBalance: 0,
  deliveries: [],
  couriers: state.couriers.map((item, index) => index === 0
    ? { ...item, status: 'available', isOnShift: true, activeDeliveryIds: [] }
    : { ...item, status: 'offline', isOnShift: false, activeDeliveryIds: [] }
  ),
};

const regularWithoutCredits = deliveryReducer(state, { type: 'ADD_DELIVERY', payload: makeDelivery('regular-1', restaurant) });
assert(regularWithoutCredits.deliveryBalance === 0, 'No-credit intake changed balance');
assert(regularWithoutCredits.deliveries.length === 0, 'No-credit intake added a regular delivery');
assert(getCreditCostForDeliveryIntake(makeDelivery('regular-cost', restaurant), restaurant) === 1, 'Regular delivery should cost one credit at intake');
assert(getCreditCostForDeliveryIntake(makeDelivery('sendi-cost', sendiPlusRestaurant), sendiPlusRestaurant) === 0, 'Sendi Plus delivery should not cost credit at intake');

const sendiPlusNoCreditState = deliveryReducer(state, {
  type: 'ADD_DELIVERY',
  payload: makeDelivery('sendi-no-credit', sendiPlusRestaurant, {
    createdAt: new Date(),
    creation_time: new Date(),
  }),
});
let blocked = assign(sendiPlusNoCreditState, 'sendi-no-credit', courier.id);
assert(blocked.deliveryBalance === 0, 'No-credit Sendi Plus assignment changed balance');
assert(blocked.deliveries[0].status === 'pending', 'No-credit Sendi Plus assignment changed delivery status');

const blockReason = getDeliveryAssignmentBlockReason(blocked.deliveries[0], {
  deliveryBalance: blocked.deliveryBalance,
  availableCourierCount: 1,
});
assert(blockReason === 'no_credits', 'Expected no_credits block reason');
assert(DELIVERY_ASSIGNMENT_BLOCK_COPY[blockReason] === 'אין מספיק יתרת משלוחים', 'No-credit copy mismatch');

state = { ...state, deliveryBalance: 1, deliveries: [] };
state = deliveryReducer(state, { type: 'ADD_DELIVERY', payload: makeDelivery('regular-1', restaurant) });
const pendingRegular = state.deliveries.find((item) => item.id === 'regular-1');
assert(state.deliveryBalance === 0, 'Regular intake did not consume exactly one credit');
assert(pendingRegular.deliveryCreditConsumedAt instanceof Date, 'Regular intake did not stamp credit consumption');
state = assign(state, 'regular-1', courier.id);
const assignedRegular = state.deliveries.find((item) => item.id === 'regular-1');
assert(state.deliveryBalance === 0, 'Assignment consumed an extra credit after regular intake');
assert(assignedRegular.status === 'assigned', 'Assignment did not set status assigned');
assert(getCreditCostForAssignment(assignedRegular) === 0, 'Consumed delivery should not cost another credit');
assert(assignedRegular.orderReadyTime.getTime() === addMinutes(assignedRegular.deliveryCreditConsumedAt, restaurant.defaultPreparationTime).getTime(), 'Prep timer did not start at credit consumption');
assert(assignedRegular.should_delivered_time.getTime() === addMinutes(assignedRegular.deliveryCreditConsumedAt, restaurant.maxDeliveryTime).getTime(), 'SLA timer did not start at credit consumption');

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
state = deliveryReducer(state, { type: 'ADD_DELIVERY', payload: makeDelivery('network-expired', sendiPlusRestaurant, { createdAt: oldCreatedAt, creation_time: oldCreatedAt }) });
const pendingNetwork = state.deliveries.find((item) => item.id === 'network-expired');
assert(pendingNetwork.offerExpiresAt instanceof Date, 'Network delivery did not receive offer expiry');
assert(pendingNetwork.offerExpiresAt.getTime() === addMinutes(oldCreatedAt, 2).getTime(), 'Network offer expiry is not exactly two minutes');
assert(pendingNetwork.deliveryCreditConsumedAt === null, 'Sendi Plus delivery consumed credit before assignment');

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
assert(!isVisibleInDefaultDeliveriesView(expiredNetwork), 'Expired delivery should be hidden from the default deliveries view');

const beforeExpiredAssignBalance = state.deliveryBalance;
state = assign(state, 'network-expired', courier.id);
assert(state.deliveryBalance === beforeExpiredAssignBalance, 'Expired delivery assignment consumed credit');
assert(state.deliveries.find((item) => item.id === 'network-expired').status === 'expired', 'Expired delivery assignment changed status');

const hourlyOffShiftCourier = {
  ...courier,
  id: 'hourly-off-shift',
  employmentType: 'שעתי',
  status: 'available',
  isOnShift: false,
  activeDeliveryIds: [],
};
const perDeliveryOffShiftCourier = {
  ...courier,
  id: 'per-delivery-off-shift',
  employmentType: 'פר משלוח',
  status: 'available',
  isOnShift: false,
  activeDeliveryIds: [],
};

assert(!canCourierAcceptDelivery(hourlyOffShiftCourier), 'Hourly courier off shift should not accept deliveries');
assert(canCourierAcceptDelivery(perDeliveryOffShiftCourier), 'Per-delivery courier off shift should accept deliveries');

state = {
  ...state,
  deliveryBalance: 3,
  deliveries: [],
  couriers: [hourlyOffShiftCourier, perDeliveryOffShiftCourier],
};
state = deliveryReducer(state, { type: 'ADD_DELIVERY', payload: makeDelivery('hourly-blocked', restaurant) });
let afterHourlyOffShiftAssign = assign(state, 'hourly-blocked', hourlyOffShiftCourier.id);
assert(afterHourlyOffShiftAssign.deliveries.find((item) => item.id === 'hourly-blocked').status === 'pending', 'Hourly off-shift assignment changed status');
assert(afterHourlyOffShiftAssign.deliveryBalance === state.deliveryBalance, 'Hourly off-shift assignment consumed credit');

state = deliveryReducer(afterHourlyOffShiftAssign, { type: 'ADD_DELIVERY', payload: makeDelivery('per-delivery-assigned', restaurant) });
state = assign(state, 'per-delivery-assigned', perDeliveryOffShiftCourier.id);
const perDeliveryAssigned = state.deliveries.find((item) => item.id === 'per-delivery-assigned');
assert(perDeliveryAssigned.status === 'assigned', 'Per-delivery off-shift courier was not assigned');
assert(perDeliveryAssigned.courierId === perDeliveryOffShiftCourier.id, 'Per-delivery off-shift assignment did not set courierId');
assert(perDeliveryAssigned.pending_runner_id === perDeliveryOffShiftCourier.id, 'Per-delivery assignment did not set pending runner');
assert(perDeliveryAssigned.is_requires_approval === true, 'Per-delivery assignment should require approval');
assert(perDeliveryAssigned.is_approved === false, 'Per-delivery assignment should start unapproved');

state = deliveryReducer(state, {
  type: 'UPDATE_STATUS',
  payload: { deliveryId: 'per-delivery-assigned', status: 'delivering' },
});
const perDeliveryStarted = state.deliveries.find((item) => item.id === 'per-delivery-assigned');
assert(perDeliveryStarted.is_approved === true, 'Per-delivery pickup did not mark approval');
assert(perDeliveryStarted.pending_runner_id === undefined, 'Per-delivery pickup did not clear pending runner');

state = deliveryReducer(state, { type: 'ADD_DELIVERY', payload: makeDelivery('per-delivery-unassign', restaurant) });
state = assign(state, 'per-delivery-unassign', perDeliveryOffShiftCourier.id);
state = deliveryReducer(state, { type: 'UNASSIGN_COURIER', payload: 'per-delivery-unassign' });
const perDeliveryUnassigned = state.deliveries.find((item) => item.id === 'per-delivery-unassign');
assert(perDeliveryUnassigned.status === 'pending', 'Unassigned delivery did not return to pending');
assert(perDeliveryUnassigned.courierId === null, 'Unassigned delivery kept courierId');
assert(perDeliveryUnassigned.runner_id === null, 'Unassigned delivery kept runner_id');
assert(perDeliveryUnassigned.pending_runner_id === undefined, 'Unassigned delivery kept pending_runner_id');
assert(perDeliveryUnassigned.is_requires_approval === false, 'Unassigned delivery kept approval requirement');

export const results = [
  'system can open without active couriers',
  'delivery intake is blocked without connected couriers',
  'delivery intake can open with a connected courier',
  'waiting deliveries do not close delivery intake',
  'no credits hard-block regular delivery intake',
  'Sendi Plus assignment is blocked without credits',
  'regular delivery intake consumes one credit',
  'cancel after assignment does not refund credit',
  'network offer expires after two minutes',
  'expired Sendi Plus offer does not consume intake credit',
  'expired offer cannot be assigned',
  'expired offer is excluded from operational delivery counts',
  'expired offer is hidden from the default deliveries view',
  'prep and SLA timers start at credit consumption',
  'hourly couriers must be on shift for assignment',
  'per-delivery couriers can receive assignments without a shift',
  'per-delivery assignments are flagged for courier approval',
  'pickup confirms per-delivery courier approval',
  'unassign clears courier assignment metadata',
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
