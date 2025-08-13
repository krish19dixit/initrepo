// Temporal change detection and analysis
import type { SatelliteImage, Coordinates, BoundingBox } from "../types/geographic"

export interface ChangeDetectionResult {
  timespan: {
    start_date: string
    end_date: string
    duration_days: number
  }
  changes: DetectedChange[]
  summary: ChangeSummary
  hotspots: ChangeHotspot[]
}

export interface DetectedChange {
  id: string
  type:
    | "vegetation_loss"
    | "vegetation_gain"
    | "urban_expansion"
    | "water_change"
    | "deforestation"
    | "agriculture_expansion"
  location: BoundingBox
  magnitude: number // 0-1 scale
  confidence: number
  area_affected: number // km²
  rate_of_change: number // per year
  properties: Record<string, any>
}

export interface ChangeSummary {
  total_changes: number
  total_area_affected: number
  dominant_change_type: string
  change_intensity: "low" | "moderate" | "high" | "extreme"
  environmental_impact: "positive" | "negative" | "neutral"
}

export interface ChangeHotspot {
  location: Coordinates
  intensity: number
  radius_km: number
  primary_change_type: string
  urgency: "low" | "medium" | "high" | "critical"
}

export class ChangeDetectionEngine {
  /**
   * Detect changes between multiple time-series images
   */
  static async detectTemporalChanges(
    images: SatelliteImage[],
    options: {
      changeThreshold: number
      minChangeArea: number
      analysisTypes: string[]
    },
  ): Promise<ChangeDetectionResult> {
    // Sort images by capture date
    const sortedImages = images.sort((a, b) => new Date(a.captureDate).getTime() - new Date(b.captureDate).getTime())

    if (sortedImages.length < 2) {
      throw new Error("At least 2 images required for change detection")
    }

    const changes: DetectedChange[] = []
    const hotspots: ChangeHotspot[] = []

    // Analyze changes between consecutive image pairs
    for (let i = 0; i < sortedImages.length - 1; i++) {
      const beforeImage = sortedImages[i]
      const afterImage = sortedImages[i + 1]

      const pairChanges = await this.detectChangesBetweenPair(beforeImage, afterImage, options)

      changes.push(...pairChanges.changes)
      hotspots.push(...pairChanges.hotspots)
    }

    // Generate summary
    const summary = this.generateChangeSummary(changes)

    const timespan = {
      start_date: sortedImages[0].captureDate,
      end_date: sortedImages[sortedImages.length - 1].captureDate,
      duration_days: Math.floor(
        (new Date(sortedImages[sortedImages.length - 1].captureDate).getTime() -
          new Date(sortedImages[0].captureDate).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    }

    return {
      timespan,
      changes: changes.filter(
        (change) => change.area_affected >= options.minChangeArea && change.magnitude >= options.changeThreshold,
      ),
      summary,
      hotspots: this.consolidateHotspots(hotspots),
    }
  }

  /**
   * Detect changes between two images
   */
  private static async detectChangesBetweenPair(
    beforeImage: SatelliteImage,
    afterImage: SatelliteImage,
    options: any,
  ): Promise<{ changes: DetectedChange[]; hotspots: ChangeHotspot[] }> {
    // Import and analyze both images
    const { SatelliteImageProcessor } = await import("./image-processor")

    const beforeAnalysis = await SatelliteImageProcessor.analyzeImage(beforeImage)
    const afterAnalysis = await SatelliteImageProcessor.analyzeImage(afterImage)

    const changes: DetectedChange[] = []
    const hotspots: ChangeHotspot[] = []

    const daysDiff = Math.floor(
      (new Date(afterImage.captureDate).getTime() - new Date(beforeImage.captureDate).getTime()) /
        (1000 * 60 * 60 * 24),
    )

    // Detect vegetation changes
    const vegChange = afterAnalysis.vegetation.forest_cover_percent - beforeAnalysis.vegetation.forest_cover_percent
    if (Math.abs(vegChange) > options.changeThreshold * 100) {
      const imageArea = this.calculateImageArea(beforeImage.bounds)
      const affectedArea = (Math.abs(vegChange) * imageArea) / 100

      changes.push({
        id: `veg-change-${beforeImage.id}-${afterImage.id}`,
        type: vegChange > 0 ? "vegetation_gain" : "vegetation_loss",
        location: beforeImage.bounds,
        magnitude: Math.abs(vegChange) / 100,
        confidence: 0.85,
        area_affected: affectedArea,
        rate_of_change: (vegChange / 100) * (365 / daysDiff),
        properties: {
          forest_change_percent: vegChange,
          ndvi_change: afterAnalysis.vegetation.ndvi_mean - beforeAnalysis.vegetation.ndvi_mean,
          health_change: afterAnalysis.vegetation.vegetation_health !== beforeAnalysis.vegetation.vegetation_health,
        },
      })

      // Add hotspot for significant vegetation loss
      if (vegChange < -10) {
        hotspots.push({
          location: {
            latitude: (beforeImage.bounds.north + beforeImage.bounds.south) / 2,
            longitude: (beforeImage.bounds.east + beforeImage.bounds.west) / 2,
          },
          intensity: Math.abs(vegChange) / 100,
          radius_km: Math.sqrt(affectedArea / Math.PI),
          primary_change_type: "deforestation",
          urgency: vegChange < -25 ? "critical" : vegChange < -15 ? "high" : "medium",
        })
      }
    }

    // Detect urban expansion
    const urbanChange = afterAnalysis.landCover.urban_percent - beforeAnalysis.landCover.urban_percent
    if (urbanChange > options.changeThreshold * 100) {
      const imageArea = this.calculateImageArea(beforeImage.bounds)
      const affectedArea = (urbanChange * imageArea) / 100

      changes.push({
        id: `urban-change-${beforeImage.id}-${afterImage.id}`,
        type: "urban_expansion",
        location: beforeImage.bounds,
        magnitude: urbanChange / 100,
        confidence: 0.82,
        area_affected: affectedArea,
        rate_of_change: (urbanChange / 100) * (365 / daysDiff),
        properties: {
          urban_change_percent: urbanChange,
          development_type: "mixed",
          infrastructure_growth: true,
        },
      })

      // Add hotspot for rapid urban expansion
      if (urbanChange > 5) {
        hotspots.push({
          location: {
            latitude: (beforeImage.bounds.north + beforeImage.bounds.south) / 2,
            longitude: (beforeImage.bounds.east + beforeImage.bounds.west) / 2,
          },
          intensity: urbanChange / 100,
          radius_km: Math.sqrt(affectedArea / Math.PI),
          primary_change_type: "urban_expansion",
          urgency: urbanChange > 15 ? "high" : "medium",
        })
      }
    }

    // Detect water changes
    const waterChange = afterAnalysis.landCover.water_percent - beforeAnalysis.landCover.water_percent
    if (Math.abs(waterChange) > options.changeThreshold * 50) {
      // More sensitive for water
      const imageArea = this.calculateImageArea(beforeImage.bounds)
      const affectedArea = (Math.abs(waterChange) * imageArea) / 100

      changes.push({
        id: `water-change-${beforeImage.id}-${afterImage.id}`,
        type: "water_change",
        location: beforeImage.bounds,
        magnitude: Math.abs(waterChange) / 100,
        confidence: 0.88,
        area_affected: affectedArea,
        rate_of_change: (waterChange / 100) * (365 / daysDiff),
        properties: {
          water_change_percent: waterChange,
          change_direction: waterChange > 0 ? "increase" : "decrease",
          possible_cause: waterChange > 0 ? "flooding_or_new_reservoir" : "drought_or_diversion",
        },
      })
    }

    return { changes, hotspots }
  }

  /**
   * Generate summary of all detected changes
   */
  private static generateChangeSummary(changes: DetectedChange[]): ChangeSummary {
    if (changes.length === 0) {
      return {
        total_changes: 0,
        total_area_affected: 0,
        dominant_change_type: "none",
        change_intensity: "low",
        environmental_impact: "neutral",
      }
    }

    const totalAreaAffected = changes.reduce((sum, change) => sum + change.area_affected, 0)
    const avgMagnitude = changes.reduce((sum, change) => sum + change.magnitude, 0) / changes.length

    // Find dominant change type
    const changeTypeCounts = changes.reduce(
      (counts, change) => {
        counts[change.type] = (counts[change.type] || 0) + 1
        return counts
      },
      {} as Record<string, number>,
    )

    const dominantChangeType = Object.entries(changeTypeCounts).sort(([, a], [, b]) => b - a)[0][0]

    // Determine change intensity
    let changeIntensity: "low" | "moderate" | "high" | "extreme"
    if (avgMagnitude < 0.1) changeIntensity = "low"
    else if (avgMagnitude < 0.3) changeIntensity = "moderate"
    else if (avgMagnitude < 0.6) changeIntensity = "high"
    else changeIntensity = "extreme"

    // Assess environmental impact
    const negativeChanges = changes.filter((c) =>
      ["vegetation_loss", "deforestation", "urban_expansion"].includes(c.type),
    ).length
    const positiveChanges = changes.filter((c) => ["vegetation_gain"].includes(c.type)).length

    let environmentalImpact: "positive" | "negative" | "neutral"
    if (negativeChanges > positiveChanges * 2) environmentalImpact = "negative"
    else if (positiveChanges > negativeChanges * 2) environmentalImpact = "positive"
    else environmentalImpact = "neutral"

    return {
      total_changes: changes.length,
      total_area_affected: totalAreaAffected,
      dominant_change_type: dominantChangeType,
      change_intensity: changeIntensity,
      environmental_impact: environmentalImpact,
    }
  }

  /**
   * Consolidate nearby hotspots
   */
  private static consolidateHotspots(hotspots: ChangeHotspot[]): ChangeHotspot[] {
    if (hotspots.length === 0) return []

    const consolidated: ChangeHotspot[] = []
    const processed = new Set<number>()

    hotspots.forEach((hotspot, index) => {
      if (processed.has(index)) return

      const nearby = hotspots.filter((other, otherIndex) => {
        if (otherIndex === index || processed.has(otherIndex)) return false

        const distance = this.calculateDistance(hotspot.location, other.location)
        return distance <= Math.max(hotspot.radius_km, other.radius_km) * 2
      })

      if (nearby.length > 0) {
        // Merge nearby hotspots
        const allHotspots = [hotspot, ...nearby]
        const avgLat = allHotspots.reduce((sum, h) => sum + h.location.latitude, 0) / allHotspots.length
        const avgLon = allHotspots.reduce((sum, h) => sum + h.location.longitude, 0) / allHotspots.length
        const maxIntensity = Math.max(...allHotspots.map((h) => h.intensity))
        const maxRadius = Math.max(...allHotspots.map((h) => h.radius_km))

        consolidated.push({
          location: { latitude: avgLat, longitude: avgLon },
          intensity: maxIntensity,
          radius_km: maxRadius,
          primary_change_type: hotspot.primary_change_type,
          urgency: this.getHighestUrgency(allHotspots.map((h) => h.urgency)),
        })

        // Mark all as processed
        nearby.forEach((_, nearbyIndex) => {
          const originalIndex = hotspots.indexOf(nearby[nearbyIndex])
          processed.add(originalIndex)
        })
      } else {
        consolidated.push(hotspot)
      }

      processed.add(index)
    })

    return consolidated
  }

  // Helper methods
  private static calculateImageArea(bounds: BoundingBox): number {
    const latDiff = bounds.north - bounds.south
    const lonDiff = bounds.east - bounds.west
    const avgLat = (bounds.north + bounds.south) / 2
    const latKm = latDiff * 111
    const lonKm = lonDiff * 111 * Math.cos((avgLat * Math.PI) / 180)
    return latKm * lonKm
  }

  private static calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180
    const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coord1.latitude * Math.PI) / 180) *
        Math.cos((coord2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private static getHighestUrgency(urgencies: string[]): "low" | "medium" | "high" | "critical" {
    if (urgencies.includes("critical")) return "critical"
    if (urgencies.includes("high")) return "high"
    if (urgencies.includes("medium")) return "medium"
    return "low"
  }
}
