"""
Real-time Delivery Simulation WebSocket Server
Simulates 6 couriers moving along real street routes in Tel Aviv using OSRM.
"""

import asyncio
import json
import math
import random
import time
import requests
import websockets
from websockets.server import serve

# ───────────────────────────────────────────────────────────────────────────────
# Constants
# ───────────────────────────────────────────────────────────────────────────────

SPEED_MS = 8.33          # 30 km/h → ~8.33 m/s
STEP_INTERVAL = 1.0      # seconds between updates
METERS_PER_STEP = SPEED_MS * STEP_INTERVAL  # ~8.33 m per tick
OSRM_URL = "http://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}?geometries=geojson&overview=full"

# Tel Aviv restaurants — exact coordinates matching delivery.context.tsx
RESTAURANTS = [
    {"name": "פיצה שמש",      "address": "דיזנגוף 164, תל אביב",         "lat": 32.0785, "lng": 34.7740},
    {"name": "בורגר סאלון",   "address": "שדרות רוטשילד 34, תל אביב",    "lat": 32.0630, "lng": 34.7750},
    {"name": "סושי קו",       "address": "אבן גבירול 101, תל אביב",       "lat": 32.0850, "lng": 34.7835},
    {"name": "טרטוריה",       "address": "נחלת בנימין 21, תל אביב",       "lat": 32.0640, "lng": 34.7705},
    {"name": "הדרקון הזהב",   "address": "הירקון 67, תל אביב",            "lat": 32.0740, "lng": 34.7670},
    {"name": "באנג בנגקוק",   "address": "שדרות ירושלים 4, יפו",          "lat": 32.0530, "lng": 34.7580},
    {"name": "טנדורי",        "address": "ביאליק 23, רמת גן",             "lat": 32.0840, "lng": 34.8090},
    {"name": "בוריטו לוקו",   "address": "פלורנטין 33, תל אביב",          "lat": 32.0560, "lng": 34.7700},
    {"name": "הים התיכון",    "address": "נמל תל אביב 12, תל אביב",       "lat": 32.0970, "lng": 34.7720},
    {"name": "אל גאוצ'ו",     "address": "ז'בוטינסקי 7, רמת גן",          "lat": 32.0810, "lng": 34.8000},
]

COURIER_NAMES = [
    "אלי כהן",
    "מיכל לוי",
    "דני אברהם",
    "רונית שמיר",
    "יוסי גולן",
    "תמר פרץ",
    "אורי ברק",
    "שירה דוד",
    "נועם לוי",
    "כרמל אזולאי",
]

TEL_AVIV_CENTER = (32.0853, 34.7818)

# ───────────────────────────────────────────────────────────────────────────────
# Utilities
# ───────────────────────────────────────────────────────────────────────────────

def haversine(lat1, lng1, lat2, lng2) -> float:
    """Returns distance in meters between two lat/lng points."""
    R = 6_371_000  # Earth radius in metres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def bearing(lat1, lng1, lat2, lng2) -> float:
    """Returns compass bearing (degrees) from point1 → point2."""
    lat1, lat2 = math.radians(lat1), math.radians(lat2)
    dlng = math.radians(lng2 - lng1)
    x = math.sin(dlng) * math.cos(lat2)
    y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlng)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


def random_destination(center_lat, center_lng, radius_km=3.0):
    """Return a random lat/lng within radius_km of center."""
    radius_deg = radius_km / 111.0
    angle = random.uniform(0, 2 * math.pi)
    r = radius_deg * math.sqrt(random.random())
    lat = center_lat + r * math.cos(angle)
    lng = center_lng + r * math.sin(angle) / math.cos(math.radians(center_lat))
    return round(lat, 6), round(lng, 6)


def fetch_route(lat1, lng1, lat2, lng2):
    """
    Query OSRM for a driving route and return list of (lat, lng) coordinate pairs.
    Falls back to a straight-line segment if OSRM is unavailable.
    """
    url = OSRM_URL.format(lng1=lng1, lat1=lat1, lng2=lng2, lat2=lat2)
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") == "Ok" and data.get("routes"):
            coords = data["routes"][0]["geometry"]["coordinates"]
            # OSRM returns [lng, lat] — we store as (lat, lng)
            return [(c[1], c[0]) for c in coords]
    except Exception as exc:
        print(f"[OSRM] Failed to fetch route: {exc}  → using straight line fallback")

    # Fallback: straight-line with 10 interpolated points
    steps = 10
    return [
        (lat1 + (lat2 - lat1) * i / steps, lng1 + (lng2 - lng1) * i / steps)
        for i in range(steps + 1)
    ]


# ───────────────────────────────────────────────────────────────────────────────
# Courier model
# ───────────────────────────────────────────────────────────────────────────────

STREET_NAMES = [
    "רחוב דיזנגוף", "רחוב אלנבי", "שדרות רוטשילד", "רחוב בן יהודה",
    "שדרות נורדאו", "רחוב הירקון", "רחוב פינסקר", "שדרות חן",
    "רחוב ארלוזורוב", "רחוב שינקין", "שדרות תל אביב", "רחוב קינג ג'ורג",
]


def random_address():
    street = random.choice(STREET_NAMES)
    number = random.randint(10, 250)
    return f"{street} {number}"


class Courier:
    def __init__(self, courier_id: str, name: str, restaurant: dict):
        self.id = courier_id
        self.name = name

        # Current position (starts at the assigned restaurant)
        self.lat = restaurant["lat"] + random.uniform(-0.001, 0.001)
        self.lng = restaurant["lng"] + random.uniform(-0.001, 0.001)
        self.heading = 0.0

        # Route state
        self.route: list = []          # List of (lat, lng) waypoints
        self.route_index: int = 0      # Index of NEXT waypoint
        self.dist_since_last: float = 0.0  # metres travelled since last waypoint

        # Phase: 'picking_up' → travelling to restaurant; 'delivering' → travelling to customer
        self.status: str = "picking_up"

        # Delivery info
        self.restaurant: dict = restaurant
        self.customer_lat: float = 0.0
        self.customer_lng: float = 0.0
        self.customer_address: str = ""
        self.total_route_dist: float = 0.0

        # Assign a first delivery immediately (async-safe: routes fetched in _start_delivery)
        self._delivery_ready = False

    # ── Route helpers ──────────────────────────────────────────────────────────

    def _build_route(self, dest_lat, dest_lng):
        """Fetch route from current position → dest and store it."""
        route = fetch_route(self.lat, self.lng, dest_lat, dest_lng)
        self.route = route
        self.route_index = 1  # we start at waypoint 0 (current position)
        self.dist_since_last = 0.0
        # Calculate total route length
        total = 0.0
        for i in range(len(route) - 1):
            total += haversine(route[i][0], route[i][1], route[i + 1][0], route[i + 1][1])
        self.total_route_dist = max(total, 1.0)

    def start_delivery(self):
        """Begin a new delivery: first pick up from restaurant, then deliver."""
        # Pick a random customer destination within 3 km of the restaurant
        self.customer_lat, self.customer_lng = random_destination(
            self.restaurant["lat"], self.restaurant["lng"], radius_km=3.0
        )
        self.customer_address = random_address()
        self.status = "picking_up"

        # Route: current position → restaurant
        self._build_route(self.restaurant["lat"], self.restaurant["lng"])
        self._delivery_ready = True

    # ── Tick ──────────────────────────────────────────────────────────────────

    def tick(self) -> bool:
        """
        Advance the courier by one time-step (STEP_INTERVAL seconds).
        Returns True if the delivery just completed.
        """
        if not self._delivery_ready or len(self.route) < 2:
            return False

        metres_remaining = METERS_PER_STEP

        while metres_remaining > 0 and self.route_index < len(self.route):
            prev = self.route[self.route_index - 1]
            nxt = self.route[self.route_index]
            seg_dist = haversine(prev[0], prev[1], nxt[0], nxt[1])
            seg_remaining = seg_dist - self.dist_since_last

            if metres_remaining >= seg_remaining:
                # Advance to next waypoint
                metres_remaining -= seg_remaining
                self.lat = nxt[0]
                self.lng = nxt[1]
                self.heading = bearing(prev[0], prev[1], nxt[0], nxt[1])
                self.dist_since_last = 0.0
                self.route_index += 1
            else:
                # Interpolate within segment
                frac = (self.dist_since_last + metres_remaining) / max(seg_dist, 0.0001)
                self.lat = prev[0] + (nxt[0] - prev[0]) * frac
                self.lng = prev[1] + (nxt[1] - prev[1]) * frac
                self.heading = bearing(prev[0], prev[1], nxt[0], nxt[1])
                self.dist_since_last += metres_remaining
                metres_remaining = 0

        # Check if reached end of route
        if self.route_index >= len(self.route):
            if self.status == "picking_up":
                # Arrived at restaurant → now head to customer
                self.status = "delivering"
                self._build_route(self.customer_lat, self.customer_lng)
            else:
                # Delivery complete!
                return True

        return False

    # ── Computed properties ───────────────────────────────────────────────────

    @property
    def progress(self) -> float:
        """Overall delivery progress 0.0 → 1.0 (restaurant pickup + customer delivery)."""
        if not self.route or self.total_route_dist == 0:
            return 0.0
        dist_covered = sum(
            haversine(self.route[i][0], self.route[i][1], self.route[i + 1][0], self.route[i + 1][1])
            for i in range(min(self.route_index - 1, len(self.route) - 1))
        ) + self.dist_since_last
        return min(dist_covered / self.total_route_dist, 1.0)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "lat": round(self.lat, 7),
            "lng": round(self.lng, 7),
            "status": self.status,
            "heading": round(self.heading, 1),
            "delivery": {
                "restaurant": self.restaurant["name"],
                "restaurantAddress": self.restaurant.get("address", ""),
                "restaurantLat": self.restaurant["lat"],
                "restaurantLng": self.restaurant["lng"],
                "customer": self.customer_address,
                "customerLat": round(self.customer_lat, 7),
                "customerLng": round(self.customer_lng, 7),
                "progress": round(self.progress, 3),
            },
        }


# ───────────────────────────────────────────────────────────────────────────────
# Simulation state
# ───────────────────────────────────────────────────────────────────────────────

class Simulation:
    def __init__(self):
        self.couriers: list[Courier] = []
        self.connected_clients: set = set()
        self._initialised = False

    def _init_couriers(self):
        print(f"[SIM] Initialising {len(COURIER_NAMES)} couriers and fetching routes from OSRM…")
        for i, name in enumerate(COURIER_NAMES):
            restaurant = RESTAURANTS[i % len(RESTAURANTS)]
            c = Courier(f"c{i + 1}", name, restaurant)
            c.start_delivery()
            self.couriers.append(c)
        self._initialised = True
        print(f"[SIM] All couriers ready.")

    async def run(self):
        """Main simulation loop — ticks every STEP_INTERVAL seconds."""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._init_couriers)

        print(f"[SIM] Simulation running. Broadcasting every {STEP_INTERVAL}s…")

        while True:
            tick_start = time.monotonic()

            # Advance each courier
            finished_indices = []
            for idx, courier in enumerate(self.couriers):
                completed = courier.tick()
                if completed:
                    finished_indices.append(idx)

            # Re-assign new deliveries for finished couriers (in executor to avoid blocking)
            for idx in finished_indices:
                courier = self.couriers[idx]
                print(f"[SIM] {courier.name} completed delivery → assigning new one")
                # Pick a new random restaurant
                courier.restaurant = random.choice(RESTAURANTS)
                courier.lat = courier.restaurant["lat"] + random.uniform(-0.001, 0.001)
                courier.lng = courier.restaurant["lng"] + random.uniform(-0.001, 0.001)
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(None, courier.start_delivery)

            # Broadcast to all connected clients
            if self.connected_clients:
                payload = json.dumps({
                    "type": "update",
                    "couriers": [c.to_dict() for c in self.couriers],
                    "timestamp": time.time(),
                })
                dead = set()
                for ws in self.connected_clients:
                    try:
                        await ws.send(payload)
                    except Exception:
                        dead.add(ws)
                self.connected_clients -= dead

            # Sleep until next tick
            elapsed = time.monotonic() - tick_start
            sleep_time = max(0, STEP_INTERVAL - elapsed)
            await asyncio.sleep(sleep_time)

    async def handle_client(self, websocket):
        """Handle a new WebSocket client connection."""
        client_addr = websocket.remote_address
        print(f"[WS] Client connected: {client_addr}")
        self.connected_clients.add(websocket)

        # Send current state immediately
        if self._initialised and self.couriers:
            try:
                await websocket.send(json.dumps({
                    "type": "update",
                    "couriers": [c.to_dict() for c in self.couriers],
                    "timestamp": time.time(),
                }))
            except Exception:
                pass

        try:
            async for message in websocket:
                # Client messages (ping, etc.) – just ignore for now
                pass
        except Exception:
            pass
        finally:
            self.connected_clients.discard(websocket)
            print(f"[WS] Client disconnected: {client_addr}")


# ───────────────────────────────────────────────────────────────────────────────
# Entry point
# ───────────────────────────────────────────────────────────────────────────────

async def main():
    sim = Simulation()

    print("=" * 60)
    print(" Real-time Delivery Simulator — Tel Aviv")
    print(" WebSocket server starting on ws://localhost:8765")
    print("=" * 60)

    # Run simulation loop and WebSocket server concurrently
    async with serve(sim.handle_client, "localhost", 8765):
        await sim.run()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[SIM] Shutting down. Goodbye!")
