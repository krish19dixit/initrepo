// In-memory spatial indexing system
import type { GeographicFeature, Coordinates, BoundingBox, SpatialIndex } from "../types/geographic"
import { isPointInBounds, calculateDistance, createBoundingBox } from "./utils"

export class QuadTreeSpatialIndex implements SpatialIndex {
  private features: Map<string, GeographicFeature> = new Map()
  private spatialGrid: Map<string, Set<string>> = new Map()
  private readonly gridSize = 0.01 // ~1km grid cells

  insert(feature: GeographicFeature): void {
    this.features.set(feature.id, feature)

    // Add to spatial grid based on feature coordinates
    const gridKeys = this.getGridKeys(feature)
    gridKeys.forEach((key) => {
      if (!this.spatialGrid.has(key)) {
        this.spatialGrid.set(key, new Set())
      }
      this.spatialGrid.get(key)!.add(feature.id)
    })
  }

  query(bounds: BoundingBox): GeographicFeature[] {
    const candidateIds = new Set<string>()

    // Get all grid cells that intersect with the bounds
    const minGridX = Math.floor(bounds.west / this.gridSize)
    const maxGridX = Math.ceil(bounds.east / this.gridSize)
    const minGridY = Math.floor(bounds.south / this.gridSize)
    const maxGridY = Math.ceil(bounds.north / this.gridSize)

    for (let x = minGridX; x <= maxGridX; x++) {
      for (let y = minGridY; y <= maxGridY; y++) {
        const key = `${x},${y}`
        const cellFeatures = this.spatialGrid.get(key)
        if (cellFeatures) {
          cellFeatures.forEach((id) => candidateIds.add(id))
        }
      }
    }

    // Filter candidates by actual bounds intersection
    const results: GeographicFeature[] = []
    candidateIds.forEach((id) => {
      const feature = this.features.get(id)
      if (feature && this.featureIntersectsBounds(feature, bounds)) {
        results.push(feature)
      }
    })

    return results
  }

  queryRadius(center: Coordinates, radiusKm: number): GeographicFeature[] {
    const bounds = createBoundingBox(center, radiusKm)
    const candidates = this.query(bounds)

    // Filter by actual distance
    return candidates.filter((feature) => {
      const featureCoords = this.getFeatureCenter(feature)
      return calculateDistance(center, featureCoords) <= radiusKm
    })
  }

  remove(id: string): boolean {
    const feature = this.features.get(id)
    if (!feature) return false

    // Remove from spatial grid
    const gridKeys = this.getGridKeys(feature)
    gridKeys.forEach((key) => {
      const cell = this.spatialGrid.get(key)
      if (cell) {
        cell.delete(id)
        if (cell.size === 0) {
          this.spatialGrid.delete(key)
        }
      }
    })

    this.features.delete(id)
    return true
  }

  clear(): void {
    this.features.clear()
    this.spatialGrid.clear()
  }

  private getGridKeys(feature: GeographicFeature): string[] {
    const keys: string[] = []

    if (feature.type === "point") {
      const coords = feature.coordinates as Coordinates
      const x = Math.floor(coords.longitude / this.gridSize)
      const y = Math.floor(coords.latitude / this.gridSize)
      keys.push(`${x},${y}`)
    } else {
      // For polygons and linestrings, add to all intersecting grid cells
      const bounds = this.getFeatureBounds(feature)
      const minX = Math.floor(bounds.west / this.gridSize)
      const maxX = Math.ceil(bounds.east / this.gridSize)
      const minY = Math.floor(bounds.south / this.gridSize)
      const maxY = Math.ceil(bounds.north / this.gridSize)

      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          keys.push(`${x},${y}`)
        }
      }
    }

    return keys
  }

  private featureIntersectsBounds(feature: GeographicFeature, bounds: BoundingBox): boolean {
    if (feature.type === "point") {
      const coords = feature.coordinates as Coordinates
      return isPointInBounds(coords, bounds)
    }

    // For other types, check if feature bounds intersect query bounds
    const featureBounds = this.getFeatureBounds(feature)
    return !(
      featureBounds.east < bounds.west ||
      bounds.east < featureBounds.west ||
      featureBounds.north < bounds.south ||
      bounds.north < featureBounds.south
    )
  }

  private getFeatureBounds(feature: GeographicFeature): BoundingBox {
    let minLat = Number.POSITIVE_INFINITY,
      maxLat = Number.NEGATIVE_INFINITY
    let minLon = Number.POSITIVE_INFINITY,
      maxLon = Number.NEGATIVE_INFINITY

    const processCoord = (coord: Coordinates) => {
      minLat = Math.min(minLat, coord.latitude)
      maxLat = Math.max(maxLat, coord.latitude)
      minLon = Math.min(minLon, coord.longitude)
      maxLon = Math.max(maxLon, coord.longitude)
    }

    if (feature.type === "point") {
      const coord = feature.coordinates as Coordinates
      processCoord(coord)
    } else if (feature.type === "linestring") {
      const coords = feature.coordinates as Coordinates[]
      coords.forEach(processCoord)
    } else if (feature.type === "polygon") {
      const coords = feature.coordinates as Coordinates[][]
      coords.forEach((ring) => ring.forEach(processCoord))
    }

    return { north: maxLat, south: minLat, east: maxLon, west: minLon }
  }

  private getFeatureCenter(feature: GeographicFeature): Coordinates {
    if (feature.type === "point") {
      return feature.coordinates as Coordinates
    }

    const bounds = this.getFeatureBounds(feature)
    return {
      latitude: (bounds.north + bounds.south) / 2,
      longitude: (bounds.east + bounds.west) / 2,
    }
  }
}

export { QuadTreeSpatialIndex as SpatialIndex }
