export type GeoPoint = {
  lat: number;
  lng: number;
};

export const isValidGeoPoint = (point: Partial<GeoPoint> | null | undefined): point is GeoPoint =>
  typeof point?.lat === 'number' &&
  Number.isFinite(point.lat) &&
  typeof point?.lng === 'number' &&
  Number.isFinite(point.lng);

const appendRoutePoint = (path: GeoPoint[], point: GeoPoint) => {
  const previous = path[path.length - 1];
  if (previous && previous.lat === point.lat && previous.lng === point.lng) return;
  path.push(point);
};

export const buildSimulatedGpsRoutePath = (points: GeoPoint[]): GeoPoint[] => {
  const validPoints = points.filter(isValidGeoPoint);
  if (validPoints.length < 2) return validPoints;

  const path: GeoPoint[] = [];
  const fallbackStepsPerLeg = 12;

  validPoints.forEach((to, index) => {
    if (index === 0) {
      appendRoutePoint(path, to);
      return;
    }

    const from = validPoints[index - 1];
    const latDelta = to.lat - from.lat;
    const lngDelta = to.lng - from.lng;
    const distance = Math.hypot(latDelta, lngDelta);

    if (distance < 0.0004) {
      appendRoutePoint(path, to);
      return;
    }

    const normalLat = -lngDelta / distance;
    const normalLng = latDelta / distance;
    const bend = Math.min(distance * 0.055, 0.0012);

    for (let step = 1; step < fallbackStepsPerLeg; step += 1) {
      const t = step / fallbackStepsPerLeg;
      const arc = Math.sin(Math.PI * t) * bend;
      appendRoutePoint(path, {
        lat: from.lat + latDelta * t + normalLat * arc,
        lng: from.lng + lngDelta * t + normalLng * arc,
      });
    }

    appendRoutePoint(path, to);
  });

  return path;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

export const getGeoDistanceKm = (from: GeoPoint, to: GeoPoint) => {
  const earthRadiusKm = 6371;
  const latDiff = toRadians(to.lat - from.lat);
  const lngDiff = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);

  const a =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDiff / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const getRoutePathDistanceKm = (path: GeoPoint[]) =>
  path.reduce((distance, point, index) => {
    if (index === 0) return distance;
    return distance + getGeoDistanceKm(path[index - 1], point);
  }, 0);

export const advanceAlongRoutePath = (path: GeoPoint[], distanceKm: number): GeoPoint | null => {
  const validPath = path.filter(isValidGeoPoint);
  if (validPath.length === 0) return null;
  if (validPath.length === 1 || distanceKm <= 0) return validPath[0];

  let remainingDistanceKm = distanceKm;

  for (let index = 1; index < validPath.length; index += 1) {
    const from = validPath[index - 1];
    const to = validPath[index];
    const segmentDistanceKm = getGeoDistanceKm(from, to);

    if (segmentDistanceKm <= 0) continue;

    if (remainingDistanceKm <= segmentDistanceKm) {
      const ratio = remainingDistanceKm / segmentDistanceKm;
      return {
        lat: from.lat + (to.lat - from.lat) * ratio,
        lng: from.lng + (to.lng - from.lng) * ratio,
      };
    }

    remainingDistanceKm -= segmentDistanceKm;
  }

  return validPath[validPath.length - 1];
};
