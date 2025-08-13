// Spatial utility functions for coordinate calculations
import type { Coordinates, BoundingBox } from "../types/geographic"

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(coord2.latitude - coord1.latitude)
  const dLon = toRadians(coord2.longitude - coord1.longitude)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) *
      Math.cos(toRadians(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Check if a point is within a bounding box
 */
export function isPointInBounds(point: Coordinates, bounds: BoundingBox): boolean {
  return (
    point.latitude >= bounds.south &&
    point.latitude <= bounds.north &&
    point.longitude >= bounds.west &&
    point.longitude <= bounds.east
  )
}

/**
 * Create a bounding box around a center point with given radius
 */
export function createBoundingBox(center: Coordinates, radiusKm: number): BoundingBox {
  const latDelta = radiusKm / 111 // Approximate km per degree latitude
  const lonDelta = radiusKm / (111 * Math.cos(toRadians(center.latitude)))

  return {
    north: center.latitude + latDelta,
    south: center.latitude - latDelta,
    east: center.longitude + lonDelta,
    west: center.longitude - lonDelta,
  }
}

/**
 * Calculate the center point of a bounding box
 */
export function getBoundingBoxCenter(bounds: BoundingBox): Coordinates {
  return {
    latitude: (bounds.north + bounds.south) / 2,
    longitude: (bounds.east + bounds.west) / 2,
  }
}

/**
 * Check if two bounding boxes intersect
 */
export function boundingBoxesIntersect(box1: BoundingBox, box2: BoundingBox): boolean {
  return !(box1.east < box2.west || box2.east < box1.west || box1.north < box2.south || box2.north < box1.south)
}

/**
 * Convert coordinates to a spatial hash for indexing
 */
export function coordinatesToHash(coord: Coordinates, precision = 6): string {
  const lat = coord.latitude.toFixed(precision)
  const lon = coord.longitude.toFixed(precision)
  return `${lat},${lon}`
}
