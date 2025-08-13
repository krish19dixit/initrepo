// Data enrichment and metadata extraction utilities
import type { GeographicFeature, Coordinates } from "../types/geographic"
import { calculateDistance } from "../spatial/utils"

export interface EnrichmentOptions {
  addElevation?: boolean
  addTimezone?: boolean
  addNearbyFeatures?: boolean
  addClimateData?: boolean
}

export class DataEnrichmentService {
  /**
   * Enrich geographic features with additional metadata
   */
  static async enrichFeatures(
    features: GeographicFeature[],
    options: EnrichmentOptions = {},
  ): Promise<GeographicFeature[]> {
    const enrichedFeatures = await Promise.all(
      features.map(async (feature) => {
        const enrichedFeature = { ...feature }

        if (options.addElevation) {
          enrichedFeature.properties.elevation = await this.getElevation(this.getFeatureCenter(feature))
        }

        if (options.addTimezone) {
          enrichedFeature.properties.timezone = await this.getTimezone(this.getFeatureCenter(feature))
        }

        if (options.addClimateData) {
          enrichedFeature.properties.climate = await this.getClimateData(this.getFeatureCenter(feature))
        }

        return enrichedFeature
      }),
    )

    if (options.addNearbyFeatures) {
      return this.addNearbyFeatures(enrichedFeatures)
    }

    return enrichedFeatures
  }

  /**
   * Get elevation data for coordinates (mock implementation)
   */
  private static async getElevation(coords: Coordinates): Promise<number> {
    // Mock elevation based on latitude (higher latitudes = higher elevation)
    // In real implementation, this would call an elevation API
    await new Promise((resolve) => setTimeout(resolve, 100)) // Simulate API call
    return Math.max(0, Math.round(Math.abs(coords.latitude - 30) * 50 + Math.random() * 1000))
  }

  /**
   * Get timezone for coordinates (mock implementation)
   */
  private static async getTimezone(coords: Coordinates): Promise<string> {
    // Mock timezone based on longitude
    await new Promise((resolve) => setTimeout(resolve, 50))
    const offset = Math.round(coords.longitude / 15)
    return `UTC${offset >= 0 ? "+" : ""}${offset}`
  }

  /**
   * Get climate data for coordinates (mock implementation)
   */
  private static async getClimateData(coords: Coordinates): Promise<{
    temperature_avg: number
    precipitation_mm: number
    climate_zone: string
  }> {
    await new Promise((resolve) => setTimeout(resolve, 150))

    // Mock climate data based on latitude
    const temp = 30 - Math.abs(coords.latitude) * 0.6 + (Math.random() - 0.5) * 10
    const precipitation = Math.max(0, 1000 - Math.abs(coords.latitude) * 20 + Math.random() * 500)

    let climate_zone = "temperate"
    if (Math.abs(coords.latitude) > 60) climate_zone = "polar"
    else if (Math.abs(coords.latitude) < 23.5) climate_zone = "tropical"
    else if (precipitation < 250) climate_zone = "arid"

    return {
      temperature_avg: Math.round(temp * 10) / 10,
      precipitation_mm: Math.round(precipitation),
      climate_zone,
    }
  }

  /**
   * Add nearby features information
   */
  private static addNearbyFeatures(features: GeographicFeature[]): GeographicFeature[] {
    return features.map((feature) => {
      const center = this.getFeatureCenter(feature)
      const nearby = features
        .filter((other) => other.id !== feature.id)
        .map((other) => ({
          id: other.id,
          name: other.name,
          distance: calculateDistance(center, this.getFeatureCenter(other)),
          type: other.type,
        }))
        .filter((other) => other.distance <= 100) // Within 100km
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5) // Top 5 nearest

      return {
        ...feature,
        properties: {
          ...feature.properties,
          nearby_features: nearby,
        },
      }
    })
  }

  /**
   * Get the center coordinates of a feature
   */
  private static getFeatureCenter(feature: GeographicFeature): Coordinates {
    if (feature.type === "point") {
      return feature.coordinates as Coordinates
    }

    // Calculate centroid for other types
    let totalLat = 0,
      totalLon = 0,
      count = 0

    const processCoord = (coord: Coordinates) => {
      totalLat += coord.latitude
      totalLon += coord.longitude
      count++
    }

    if (feature.type === "linestring") {
      ;(feature.coordinates as Coordinates[]).forEach(processCoord)
    } else if (feature.type === "polygon") {
      ;(feature.coordinates as Coordinates[][])[0].forEach(processCoord)
    }

    return {
      latitude: totalLat / count,
      longitude: totalLon / count,
    }
  }
}
