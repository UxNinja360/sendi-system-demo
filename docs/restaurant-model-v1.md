# Restaurant Model v1

Purpose: define what a restaurant means in Sendi before we continue expanding UI and business logic.

Status: working draft.
Last updated: 2026-05-07.

## Current Code Reality

The current `Restaurant` type lives in `src/app/types/delivery.types.ts` and contains:

- `id`
- `name`
- `chainId`
- `type`
- `phone`
- `address`
- `city`
- `street`
- `lat`
- `lng`
- `rating`
- `isActive`
- `totalOrders`
- `averageDeliveryTime`
- `defaultPreparationTime`
- `maxDeliveryTime`
- `deliveryRate`
- `deliveryInterval`
- `maxDeliveriesPerHour`

Main usage today:

- Restaurant list displays name, chain id, type, active status, address, phone, contact person, and delivery count.
- Restaurant details displays summary metrics, address, phone, type, chain id, preparation time, max delivery time, and recent deliveries.
- Add restaurant currently creates a basic active restaurant with name, phone, address, type, coordinates, default timing, and generated delivery rate.
- Reducer supports add, update, toggle active, remove, and set restaurants.

Important mismatch:

- `contactPerson`, `username`, `linkedHubs`, and some list fields are currently derived/demo-only in `restaurants-screen.tsx`, not part of the real `Restaurant` model.
- `linkedHubs` now needs to become a real business field. Product meaning: which delivery hubs/companies are assigned to this restaurant.
- `chainId` currently behaves like a chain/group identifier, but the app still treats every row as a restaurant branch.
- `isActive` currently means "can receive/generate deliveries", but the UI copy sometimes describes it like "connected".

## Model Shape

For the product, a restaurant row should represent a branch/location, not only a brand.

Recommended naming:

- `RestaurantChain`: brand/network level, optional for independent restaurants.
- `RestaurantBranch`: the actual operational unit that creates deliveries.

Short-term code can keep the name `Restaurant`, but the meaning should be: restaurant branch.

## MVP Required Fields

For the current base application, creating a restaurant should require:

- `name`: restaurant/branch name.
- `phone`: main restaurant phone number.
- `address`: full restaurant address.
- `linkedHubIds`: assigned delivery hubs/companies.

Product label in Hebrew:

- `מוקדים משויכים`

Current default:

- Every existing restaurant should be linked to the first hub/company: `TLV RUNNERS`.

## Restaurant Branch

### Identity

- `id`: internal Sendi branch id.
- `name`: visible branch/restaurant name.
- `chainId`: optional chain/group id. Independent restaurants can use `null` or `'-'`.
- `chainName`: optional display name for the parent chain.
- `externalIds`: optional object for API/POS/platform ids.
- `createdAt`: when the branch was added to Sendi.
- `updatedAt`: last model-level update.

Decision needed:

- Should `chainId` remain a string for all restaurants, or become nullable for independent restaurants?

### Classification

- `type`: cuisine/business type, for example pizza, burger, sushi.
- `tags`: optional labels such as kosher, fast-food, premium, mall, ghost kitchen.
- `priority`: optional operational priority.

Decision needed:

- Do we need a fixed enum for restaurant types, or keep free text for now?

### Contact

- `phone`: main branch phone.
- `contactPerson`: main operational contact.
- `contactPhone`: direct contact phone if different from branch phone.
- `email`: optional.
- `notes`: internal notes for dispatch/support.

Current gap:

- `contactPerson` is shown in the restaurants table but is not stored in `Restaurant`.

### Location

- `address`: formatted full address.
- `city`
- `street`
- `building`
- `lat`
- `lng`
- `areaId`: internal delivery area.
- `zoneIds`: delivery zones served by this branch.
- `pickupInstructions`: instructions for couriers.

Current gap:

- `street` currently includes street and number together.
- There is no separate `building`.
- There is no explicit delivery zone relationship.

### Assigned Delivery Hubs

This is the new `מוקדים משויכים` concept.

Meaning:

- A delivery hub is the company/dispatch operation that can handle deliveries for a restaurant.
- Today the system has one hub/company: `TLV RUNNERS`.
- Later the system can support additional delivery companies.
- A restaurant can be assigned to one or more hubs.

Recommended model:

```ts
export interface DeliveryHub {
  id: string;
  name: string;
  isActive: boolean;
}
```

Recommended restaurant field:

```ts
linkedHubIds: string[];
```

Rules:

- An operational restaurant should have at least one linked hub.
- Use stable ids in data, not display names. Example: `['tlv-runners']`.
- UI should display hub names, for example `TLV RUNNERS`.
- If a restaurant has no linked hubs, it should be treated as unassigned and should not receive auto-generated deliveries.

Future options:

- Add `primaryHubId` if one hub should be the default.
- Add hub-specific rules if different companies serve different hours, areas, or pricing for the same restaurant.

### Operational Status

- `isActive`: branch is allowed to receive/generate deliveries.
- `connectionStatus`: integration/availability state.
  - `connected`
  - `disconnected`
  - `manual_only`
  - `suspended`
- `acceptingOrders`: branch is currently accepting new delivery requests.
- `pauseReason`: optional reason when paused.
- `lastSeenAt`: last integration heartbeat or manual activity.

Decision needed:

- Should "active" mean business enabled, or live connected? These should probably be separate fields.

### Timing And SLA

- `defaultPreparationTime`: default prep time in minutes.
- `maxDeliveryTime`: target max time from assignment/order to customer.
- `handoffBufferMinutes`: expected courier pickup buffer.
- `lateThresholdMinutes`: when a delivery becomes operationally late.
- `slaPolicyId`: optional reference to a reusable SLA policy.

Current behavior:

- New deliveries inherit prep/max delivery time from the restaurant.
- Restaurant details can edit `defaultPreparationTime` and `maxDeliveryTime`.

### Delivery Generation / Demand

For the demo/simulation:

- `deliveryRate`: how many deliveries are created per interval.
- `deliveryInterval`: interval in minutes.
- `maxDeliveriesPerHour`: per-branch hourly cap.

Recommended naming later:

- `demoDemand.rate`
- `demoDemand.intervalMinutes`
- `demoDemand.maxPerHour`

Decision needed:

- Keep these fields on the production model, or move them under a demo/simulation config?

### Pricing And Billing

Potential fields:

- `billingModel`: fixed, distance, zone, custom.
- `restaurantChargePolicyId`: optional pricing policy.
- `commissionRate`: optional percent.
- `minimumCharge`: optional amount.
- `cashEnabled`: whether cash orders are allowed.
- `invoiceCustomerId`: billing account/customer id.

Current gap:

- Delivery-level finance exists, but restaurant-level billing rules are not modeled.

### Integration

Potential fields:

- `source`: manual, API, POS, webhook, imported.
- `integrationProvider`: optional.
- `apiEnabled`: boolean.
- `webhookUrl`: optional.
- `lastWebhookAt`: optional.
- `credentialsStatus`: not_configured, valid, invalid.

Current gap:

- Restaurant list shows connection-like status using `isActive`, but there is no real integration model.

### Metrics

Stored or derived:

- `totalOrders`
- `averageDeliveryTime`
- `rating`
- `activeDeliveryCount`: should be derived from deliveries.
- `completedDeliveryCount`: should be derived from deliveries.
- `revenue`: should be derived from deliveries.

Recommended rule:

- Store historical/imported metrics only if they come from outside Sendi.
- Derive live operational metrics from `deliveries`.

## Proposed Short-Term Type

This is a practical next version that fits the current app without overbuilding:

```ts
export type RestaurantConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'manual_only'
  | 'suspended';

export interface DeliveryHub {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  chainId: string | null;
  chainName?: string;
  type: string;
  tags?: string[];
  linkedHubIds: string[];

  phone: string;
  contactPerson?: string;
  contactPhone?: string;
  email?: string;
  notes?: string;

  address: string;
  city: string;
  street: string;
  building?: string;
  lat: number;
  lng: number;
  areaId?: string;
  zoneIds?: string[];
  pickupInstructions?: string;

  isActive: boolean;
  connectionStatus: RestaurantConnectionStatus;
  acceptingOrders: boolean;
  pauseReason?: string;
  lastSeenAt?: Date | null;

  defaultPreparationTime: number;
  maxDeliveryTime: number;
  handoffBufferMinutes?: number;
  lateThresholdMinutes?: number;

  deliveryRate: number;
  deliveryInterval: number;
  maxDeliveriesPerHour: number;

  rating?: number;
  totalOrders?: number;
  averageDeliveryTime?: number;

  createdAt?: Date;
  updatedAt?: Date;
}
```

## Derived Data

These should not be hand-maintained on the restaurant row unless imported from an external system:

- active deliveries count
- completed deliveries count
- revenue
- cancellation rate
- average delivery time for the current day
- active courier load around this restaurant
- busy/overloaded state

## Reducer Rules

Restaurant reducer/use-cases should eventually own these actions:

- `ADD_RESTAURANT`
- `UPDATE_RESTAURANT`
- `SET_RESTAURANT_ACTIVE`
- `SET_RESTAURANT_CONNECTION_STATUS`
- `SET_RESTAURANT_ACCEPTING_ORDERS`
- `SET_RESTAURANT_LINKED_HUBS`
- `REMOVE_RESTAURANT`
- `SET_RESTAURANTS`

Rules:

- A restaurant with active deliveries cannot be removed.
- A restaurant can be inactive but still visible historically.
- `isActive=false` should stop new deliveries, not delete or hide history.
- An active restaurant should have at least one linked hub.
- Auto-generated deliveries should only be created for restaurants with active linked hubs.
- Updating prep/SLA should affect new deliveries only, unless explicitly applying to open deliveries.
- Operational metrics should be calculated from deliveries, not stored manually.

## UI Implications

Restaurant list should eventually separate:

- business status: active/inactive
- live connection: connected/disconnected/manual
- order intake: accepting/paused

Restaurant details should eventually include sections:

- profile
- location
- contact
- assigned hubs
- operations
- SLA/timing
- billing
- integration
- recent deliveries

## Open Questions For Product

1. Is every row a branch, or do we need separate chain pages?
2. Can one restaurant have multiple branches with the same name?
3. Is `chainId` a real external id, an internal grouping id, or only a display helper?
4. What does "active" mean exactly: enabled in system, connected to integration, or accepting orders right now?
5. Do restaurants have opening hours, or are operating hours global/zone-based only?
6. Do restaurants belong to one delivery zone or multiple zones?
7. Should prep time be per restaurant, per branch, per hour, or per order?
8. How do we price restaurant charges: fixed, distance-based, zone-based, custom contract?
9. Which fields come from API/POS and which are edited manually in Sendi?
10. Should delivery generation fields remain part of restaurant data, or move into a demo-only config?
11. Can a restaurant be assigned to multiple delivery companies at the same time?
12. If multiple hubs are assigned, do we need one primary/default hub?
13. Can different hubs have different hours, pricing, or service areas for the same restaurant?

## Immediate Next Step

Before changing TypeScript types, fill the answers for:

- Use `tlv-runners` as the initial hub id for `TLV RUNNERS`.
- Add `linkedHubIds` to every seeded restaurant with `['tlv-runners']`.
- Update create/edit restaurant UI to require name, phone, address, and assigned hubs.
- Keep billing for later unless it blocks restaurant creation or dispatch.
