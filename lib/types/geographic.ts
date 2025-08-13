// Geographic data types and interfaces
export interface Coordinates {
  latitude: number
  longitude: number
}

export interface BoundingBox {
  north: number
  south: number
  east: number
  west: number
}

export interface GeographicFeature {
  id: string
  name: string
  type: "point" | "polygon" | "linestring"
  coordinates: Coordinates | Coordinates[] | Coordinates[][]
  properties: Record<string, any>
  metadata?: {
    source?: string
    timestamp?: string
    accuracy?: number
  }
}

export interface SpatialIndex {
  insert(feature: GeographicFeature): void
  query(bounds: BoundingBox): GeographicFeature[]
  queryRadius(center: Coordinates, radiusKm: number): GeographicFeature[]
  remove(id: string): boolean
  clear(): void
}

export interface SatelliteImage {
  id: string
  url: string
  bounds: BoundingBox
  resolution: number // meters per pixel
  captureDate: string
  bands: string[] // e.g., ['red', 'green', 'blue', 'nir']
  metadata: Record<string, any>
}

export interface SpatialQuery {
  type: "point" | "radius" | "bounds" | "polygon"
  coordinates?: Coordinates
  radius?: number // in kilometers
  bounds?: BoundingBox
  polygon?: Coordinates[]
  filters?: Record<string, any>
}
