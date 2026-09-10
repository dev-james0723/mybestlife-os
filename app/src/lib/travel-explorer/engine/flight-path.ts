import { Matrix4, Quaternion, Vector3 } from "three";
import { WGS84_ELLIPSOID } from "3d-tiles-renderer/three";

export const EARTH_RADIUS = 6378137;
export const ORBIT_POSITION = new Vector3(-12e6, -16e6, 12e6);
const POLAR = new Vector3(0, 0, 1);
const IDENTITY = new Quaternion();
const POLAR_RADIUS = 6356752.314245;

function surfaceRadius(direction: Vector3) {
  return 1 / Math.sqrt((direction.x ** 2 + direction.y ** 2) / EARTH_RADIUS ** 2 + direction.z ** 2 / POLAR_RADIUS ** 2);
}

export type FlightPath = ReturnType<typeof createFlightPath>;

export function createFlightPath(
  position: Vector3,
  orientation: Quaternion,
  destination: { lat: number; lng: number } | null,
  detailed = false,
) {
  const endLook = new Vector3();
  const endUp = POLAR.clone();
  const endPosition = ORBIT_POSITION.clone();
  if (destination) {
    const lat = destination.lat * Math.PI / 180;
    const lng = destination.lng * Math.PI / 180;
    WGS84_ELLIPSOID.getCartographicToPosition(lat, lng, 0, endLook);
    const north = new Vector3();
    WGS84_ELLIPSOID.getEastNorthUpAxes(lat, lng, new Vector3(), north, endUp);
    // With no city tiles, frame the actual region instead of magnifying
    // a low-resolution world texture into a featureless street-level view.
    const altitude = detailed ? 18000 : 2.2e6;
    endPosition.copy(endLook).addScaledVector(endUp, altitude).addScaledVector(north, -altitude * 0.65);
  }
  const startDirection = position.clone().normalize();
  const endDirection = endPosition.clone().normalize();
  const angle = startDirection.angleTo(endDirection);
  return {
    startPosition: position.clone(), endPosition, endLook, endUp,
    startOrientation: orientation.clone(), startDirection,
    rotation: new Quaternion().setFromUnitVectors(startDirection, endDirection),
    upRotation: new Quaternion().setFromUnitVectors(POLAR, endUp),
    startAltitude: Math.max(1, position.length() - surfaceRadius(startDirection)),
    endAltitude: endPosition.length() - surfaceRadius(endDirection),
    // A regional hop pulls back before crossing the planet; interpolation
    // follows its surface and can never cut through the Earth.
    arcHeight: Math.max(0, angle - 0.15) * EARTH_RADIUS * 0.55,
  };
}

const scratchRotation = new Quaternion();
const scratchLook = new Vector3();
const scratchUp = new Vector3();
const scratchUpRotation = new Quaternion();
const scratchMatrix = new Matrix4();
const scratchOrientation = new Quaternion();

/** Allocation-free frame evaluation, independent of display refresh rate. */
export function sampleFlightPath(path: FlightPath, progress: number, position: Vector3, orientation: Quaternion) {
  const t = Math.max(0, Math.min(1, progress));
  const k = t * t * t * (t * (t * 6 - 15) + 10);
  scratchRotation.slerpQuaternions(IDENTITY, path.rotation, k);
  const altitude = Math.exp(Math.log(path.startAltitude) * (1 - k) + Math.log(path.endAltitude) * k)
    + path.arcHeight * Math.sin(Math.PI * k) ** 2;
  position.copy(path.startDirection).applyQuaternion(scratchRotation);
  position.multiplyScalar(surfaceRadius(position) + altitude);
  if (t === 0) position.copy(path.startPosition);
  if (t === 1) position.copy(path.endPosition);
  scratchLook.copy(path.endLook).multiplyScalar(k);
  scratchUpRotation.slerpQuaternions(IDENTITY, path.upRotation, k);
  scratchUp.copy(POLAR).applyQuaternion(scratchUpRotation);
  scratchMatrix.lookAt(position, scratchLook, scratchUp);
  scratchOrientation.setFromRotationMatrix(scratchMatrix);
  orientation.slerpQuaternions(path.startOrientation, scratchOrientation, k);
}
