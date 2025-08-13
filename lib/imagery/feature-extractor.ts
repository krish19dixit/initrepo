// Advanced feature extraction from satellite imagery
import type { SatelliteImage, BoundingBox, Coordinates } from "../types/geographic"
import type { ExtractedFeature, ImageAnalysisResult } from "./image-processor"

export interface FeatureExtractionOptions {
  includeVegetation: boolean
  includeWater: boolean
  includeUrban: boolean
  includeAgriculture: boolean
  minFeatureSize: number // minimum area in km²
  confidenceThreshold: number
}

export interface AdvancedFeature extends ExtractedFeature {
  geometry: {
    centroid: Coordinates
    perimeter: number
    shape_complexity: number
  }
  temporal?: {
    change_rate: number
    trend: "increasing" | "decreasing" | "stable"
    seasonality: number
  }
  spectral: {
    dominant_wavelength: number
    spectral_signature: number[]
    uniqueness_score: number
  }
}

export class AdvancedFeatureExtractor {
  /**
   * Extract advanced features with detailed analysis
   */
  static async extractAdvancedFeatures(
    image: SatelliteImage,
    options: FeatureExtractionOptions,
  ): Promise<AdvancedFeature[]> {
    const basicAnalysis = await import("./image-processor").then((module) =>
      module.SatelliteImageProcessor.analyzeImage(image),
    )

    const features: AdvancedFeature[] = []

    if (options.includeVegetation) {
      const vegFeatures = await this.extractVegetationFeatures(image, basicAnalysis, options)
      features.push(...vegFeatures)
    }

    if (options.includeWater) {
      const waterFeatures = await this.extractWaterFeatures(image, basicAnalysis, options)
      features.push(...waterFeatures)
    }

    if (options.includeUrban) {
      const urbanFeatures = await this.extractUrbanFeatures(image, basicAnalysis, options)
      features.push(...urbanFeatures)
    }

    if (options.includeAgriculture) {
      const agriFeatures = await this.extractAgricultureFeatures(image, basicAnalysis, options)
      features.push(...agriFeatures)
    }

    return features.filter(
      (feature) => feature.area_km2 >= options.minFeatureSize && feature.confidence >= options.confidenceThreshold,
    )
  }

  /**
   * Extract vegetation features with detailed analysis
   */
  private static async extractVegetationFeatures(
    image: SatelliteImage,
    analysis: ImageAnalysisResult,
    options: FeatureExtractionOptions,
  ): Promise<AdvancedFeature[]> {
    const features: AdvancedFeature[] = []
    const totalArea = this.calculateImageArea(image.bounds)

    // Forest features
    if (analysis.vegetation.forest_cover_percent > 10) {
      features.push({
        type: "forest",
        bounds: this.createSubBounds(image.bounds, 0.6),
        confidence: 0.88,
        area_km2: totalArea * (analysis.vegetation.forest_cover_percent / 100),
        properties: {
          forest_type: this.determineForestType(image.bounds),
          canopy_density: analysis.vegetation.ndvi_mean,
          biodiversity_index: 0.6 + Math.random() * 0.4,
          carbon_storage_estimate: ((totalArea * analysis.vegetation.forest_cover_percent) / 100) * 150, // tons CO2/km²
        },
        geometry: {
          centroid: this.calculateCentroid(image.bounds),
          perimeter: Math.sqrt((totalArea * analysis.vegetation.forest_cover_percent) / 100) * 4,
          shape_complexity: 0.7 + Math.random() * 0.3,
        },
        spectral: {
          dominant_wavelength: 550, // Green peak for vegetation
          spectral_signature: [0.1, 0.8, 0.3, 0.9, 0.2, 0.1], // Mock spectral signature
          uniqueness_score: 0.85,
        },
      })
    }

    // Grassland features
    if (analysis.landCover.vegetation_percent > analysis.vegetation.forest_cover_percent) {
      const grasslandPercent = analysis.landCover.vegetation_percent - analysis.vegetation.forest_cover_percent
      features.push({
        type: "vegetation",
        bounds: this.createSubBounds(image.bounds, 0.4),
        confidence: 0.82,
        area_km2: totalArea * (grasslandPercent / 100),
        properties: {
          vegetation_type: "grassland",
          grass_height_estimate: 0.3 + Math.random() * 0.7,
          grazing_potential: "moderate",
          seasonal_variation: "high",
        },
        geometry: {
          centroid: this.calculateCentroid(image.bounds),
          perimeter: Math.sqrt((totalArea * grasslandPercent) / 100) * 4,
          shape_complexity: 0.4 + Math.random() * 0.3,
        },
        spectral: {
          dominant_wavelength: 520,
          spectral_signature: [0.15, 0.6, 0.4, 0.7, 0.25, 0.1],
          uniqueness_score: 0.75,
        },
      })
    }

    return features
  }

  /**
   * Extract water body features with detailed analysis
   */
  private static async extractWaterFeatures(
    image: SatelliteImage,
    analysis: ImageAnalysisResult,
    options: FeatureExtractionOptions,
  ): Promise<AdvancedFeature[]> {
    const features: AdvancedFeature[] = []

    analysis.water.water_bodies.forEach((waterBody, index) => {
      features.push({
        type: "water",
        bounds: waterBody.bounds,
        confidence: 0.92,
        area_km2: waterBody.area_km2,
        properties: {
          water_type: waterBody.type,
          depth_estimate: this.estimateWaterDepth(waterBody.type),
          water_quality: analysis.water.water_quality_index,
          turbidity: 0.1 + Math.random() * 0.4,
          temperature_estimate: this.estimateWaterTemperature(image.bounds, waterBody.type),
        },
        geometry: {
          centroid: this.calculateCentroid(waterBody.bounds),
          perimeter: this.estimateWaterPerimeter(waterBody.area_km2, waterBody.type),
          shape_complexity: waterBody.type === "river" ? 0.8 : 0.3,
        },
        spectral: {
          dominant_wavelength: 475, // Blue for water
          spectral_signature: [0.05, 0.1, 0.8, 0.1, 0.05, 0.02],
          uniqueness_score: 0.9,
        },
      })
    })

    return features
  }

  /**
   * Extract urban features with detailed analysis
   */
  private static async extractUrbanFeatures(
    image: SatelliteImage,
    analysis: ImageAnalysisResult,
    options: FeatureExtractionOptions,
  ): Promise<AdvancedFeature[]> {
    const features: AdvancedFeature[] = []
    const totalArea = this.calculateImageArea(image.bounds)

    if (analysis.landCover.urban_percent > 5) {
      features.push({
        type: "urban",
        bounds: this.createSubBounds(image.bounds, 0.3),
        confidence: 0.87,
        area_km2: totalArea * (analysis.landCover.urban_percent / 100),
        properties: {
          development_type: this.determineUrbanType(analysis.landCover.urban_percent),
          building_density: analysis.landCover.urban_percent > 30 ? "high" : "medium",
          population_estimate: this.estimatePopulation((totalArea * analysis.landCover.urban_percent) / 100),
          infrastructure_quality: "good",
          green_space_ratio: Math.max(0, 0.3 - analysis.landCover.urban_percent / 100),
        },
        geometry: {
          centroid: this.calculateCentroid(image.bounds),
          perimeter: Math.sqrt((totalArea * analysis.landCover.urban_percent) / 100) * 4.5,
          shape_complexity: 0.6 + Math.random() * 0.4,
        },
        spectral: {
          dominant_wavelength: 600, // Mixed spectrum for urban areas
          spectral_signature: [0.3, 0.4, 0.4, 0.3, 0.5, 0.4],
          uniqueness_score: 0.7,
        },
      })
    }

    return features
  }

  /**
   * Extract agriculture features with detailed analysis
   */
  private static async extractAgricultureFeatures(
    image: SatelliteImage,
    analysis: ImageAnalysisResult,
    options: FeatureExtractionOptions,
  ): Promise<AdvancedFeature[]> {
    const features: AdvancedFeature[] = []
    const totalArea = this.calculateImageArea(image.bounds)

    if (analysis.landCover.agriculture_percent > 10) {
      features.push({
        type: "agriculture",
        bounds: this.createSubBounds(image.bounds, 0.5),
        confidence: 0.83,
        area_km2: totalArea * (analysis.landCover.agriculture_percent / 100),
        properties: {
          crop_type: this.determineCropType(image.bounds, analysis.vegetation.ndvi_mean),
          growth_stage: this.determineGrowthStage(analysis.vegetation.ndvi_mean),
          irrigation_type: Math.random() > 0.5 ? "irrigated" : "rainfed",
          yield_estimate: this.estimateYield(analysis.vegetation.ndvi_mean),
          soil_health: analysis.vegetation.ndvi_mean > 0.6 ? "good" : "moderate",
        },
        geometry: {
          centroid: this.calculateCentroid(image.bounds),
          perimeter: Math.sqrt((totalArea * analysis.landCover.agriculture_percent) / 100) * 4,
          shape_complexity: 0.2 + Math.random() * 0.2, // Agricultural fields are usually regular
        },
        spectral: {
          dominant_wavelength: 530,
          spectral_signature: [0.1, 0.7, 0.5, 0.8, 0.3, 0.1],
          uniqueness_score: 0.8,
        },
      })
    }

    return features
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

  private static calculateCentroid(bounds: BoundingBox): Coordinates {
    return {
      latitude: (bounds.north + bounds.south) / 2,
      longitude: (bounds.east + bounds.west) / 2,
    }
  }

  private static createSubBounds(bounds: BoundingBox, factor: number): BoundingBox {
    const centerLat = (bounds.north + bounds.south) / 2
    const centerLon = (bounds.east + bounds.west) / 2
    const latRange = ((bounds.north - bounds.south) * factor) / 2
    const lonRange = ((bounds.east - bounds.west) * factor) / 2

    return {
      north: centerLat + latRange,
      south: centerLat - latRange,
      east: centerLon + lonRange,
      west: centerLon - lonRange,
    }
  }

  private static determineForestType(bounds: BoundingBox): string {
    const avgLat = Math.abs((bounds.north + bounds.south) / 2)
    if (avgLat > 60) return "boreal"
    if (avgLat > 40) return "temperate"
    if (avgLat > 23.5) return "subtropical"
    return "tropical"
  }

  private static estimateWaterDepth(type: string): number {
    switch (type) {
      case "river":
        return 2 + Math.random() * 8
      case "lake":
        return 10 + Math.random() * 40
      case "reservoir":
        return 15 + Math.random() * 35
      case "ocean":
        return 100 + Math.random() * 1000
      default:
        return 5
    }
  }

  private static estimateWaterTemperature(bounds: BoundingBox, type: string): number {
    const avgLat = Math.abs((bounds.north + bounds.south) / 2)
    const baseTemp = 30 - avgLat * 0.5
    const variation = type === "ocean" ? 5 : 10
    return baseTemp + (Math.random() - 0.5) * variation
  }

  private static estimateWaterPerimeter(area: number, type: string): number {
    if (type === "river") {
      return Math.sqrt(area) * 20 // Rivers have high perimeter to area ratio
    }
    return 2 * Math.sqrt(Math.PI * area) // Approximate circular perimeter
  }

  private static determineUrbanType(urbanPercent: number): string {
    if (urbanPercent > 50) return "dense_urban"
    if (urbanPercent > 30) return "urban"
    if (urbanPercent > 15) return "suburban"
    return "rural_settlement"
  }

  private static estimatePopulation(urbanArea: number): number {
    // Rough estimate: 1000-5000 people per km² for urban areas
    return Math.round(urbanArea * (1000 + Math.random() * 4000))
  }

  private static determineCropType(bounds: BoundingBox, ndvi: number): string {
    const avgLat = Math.abs((bounds.north + bounds.south) / 2)

    if (avgLat < 30) {
      return ndvi > 0.6 ? "rice" : "sugarcane"
    } else if (avgLat < 45) {
      return ndvi > 0.7 ? "corn" : "wheat"
    } else {
      return ndvi > 0.6 ? "barley" : "oats"
    }
  }

  private static determineGrowthStage(ndvi: number): string {
    if (ndvi < 0.3) return "early_growth"
    if (ndvi < 0.6) return "vegetative"
    if (ndvi < 0.8) return "reproductive"
    return "maturity"
  }

  private static estimateYield(ndvi: number): number {
    // Yield in tons per hectare, correlated with NDVI
    return Math.max(1, ndvi * 8 + Math.random() * 2)
  }
}
