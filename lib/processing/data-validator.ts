// Data validation and quality assessment utilities
import type { GeographicFeature, Coordinates } from "../types/geographic"

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  quality_score: number // 0-100
}

export interface DataQualityMetrics {
  total_features: number
  valid_features: number
  invalid_features: number
  completeness_score: number
  accuracy_score: number
  consistency_score: number
  overall_quality: number
}

export class DataValidator {
  /**
   * Validate a single geographic feature
   */
  static validateFeature(feature: GeographicFeature): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    let qualityScore = 100

    // Required field validation
    if (!feature.id || feature.id.trim() === "") {
      errors.push("Feature ID is required")
      qualityScore -= 20
    }

    if (!feature.name || feature.name.trim() === "") {
      warnings.push("Feature name is missing")
      qualityScore -= 5
    }

    if (!feature.type || !["point", "linestring", "polygon"].includes(feature.type)) {
      errors.push("Invalid or missing feature type")
      qualityScore -= 25
    }

    // Coordinate validation
    const coordValidation = this.validateCoordinates(feature)
    errors.push(...coordValidation.errors)
    warnings.push(...coordValidation.warnings)
    qualityScore -= coordValidation.qualityPenalty

    // Properties validation
    if (!feature.properties || Object.keys(feature.properties).length === 0) {
      warnings.push("Feature has no properties")
      qualityScore -= 10
    }

    // Metadata validation
    if (!feature.metadata) {
      warnings.push("Feature has no metadata")
      qualityScore -= 5
    } else {
      if (!feature.metadata.source) {
        warnings.push("Data source not specified")
        qualityScore -= 3
      }
      if (!feature.metadata.timestamp) {
        warnings.push("Timestamp not specified")
        qualityScore -= 2
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      quality_score: Math.max(0, qualityScore),
    }
  }

  /**
   * Validate coordinates based on feature type
   */
  private static validateCoordinates(feature: GeographicFeature): {
    errors: string[]
    warnings: string[]
    qualityPenalty: number
  } {
    const errors: string[] = []
    const warnings: string[] = []
    let qualityPenalty = 0

    if (!feature.coordinates) {
      errors.push("Coordinates are required")
      return { errors, warnings, qualityPenalty: 50 }
    }

    switch (feature.type) {
      case "point":
        const pointCoords = feature.coordinates as Coordinates
        const pointValidation = this.validateSingleCoordinate(pointCoords)
        if (!pointValidation.isValid) {
          errors.push("Invalid point coordinates")
          qualityPenalty += 30
        }
        if (pointValidation.isPrecise === false) {
          warnings.push("Low coordinate precision")
          qualityPenalty += 5
        }
        break

      case "linestring":
        const lineCoords = feature.coordinates as Coordinates[]
        if (!Array.isArray(lineCoords) || lineCoords.length < 2) {
          errors.push("LineString must have at least 2 coordinates")
          qualityPenalty += 30
        } else {
          lineCoords.forEach((coord, index) => {
            if (!this.validateSingleCoordinate(coord).isValid) {
              errors.push(`Invalid coordinate at index ${index}`)
              qualityPenalty += 10
            }
          })
        }
        break

      case "polygon":
        const polygonCoords = feature.coordinates as Coordinates[][]
        if (!Array.isArray(polygonCoords) || polygonCoords.length === 0) {
          errors.push("Polygon must have at least one ring")
          qualityPenalty += 30
        } else {
          polygonCoords.forEach((ring, ringIndex) => {
            if (!Array.isArray(ring) || ring.length < 4) {
              errors.push(`Polygon ring ${ringIndex} must have at least 4 coordinates`)
              qualityPenalty += 20
            } else {
              // Check if ring is closed
              const first = ring[0]
              const last = ring[ring.length - 1]
              if (first.latitude !== last.latitude || first.longitude !== last.longitude) {
                errors.push(`Polygon ring ${ringIndex} is not closed`)
                qualityPenalty += 15
              }

              ring.forEach((coord, coordIndex) => {
                if (!this.validateSingleCoordinate(coord).isValid) {
                  errors.push(`Invalid coordinate in ring ${ringIndex} at index ${coordIndex}`)
                  qualityPenalty += 5
                }
              })
            }
          })
        }
        break
    }

    return { errors, warnings, qualityPenalty }
  }

  /**
   * Validate a single coordinate
   */
  private static validateSingleCoordinate(coord: Coordinates): {
    isValid: boolean
    isPrecise: boolean
  } {
    if (typeof coord.latitude !== "number" || typeof coord.longitude !== "number") {
      return { isValid: false, isPrecise: false }
    }

    const isValid =
      coord.latitude >= -90 &&
      coord.latitude <= 90 &&
      coord.longitude >= -180 &&
      coord.longitude <= 180 &&
      !isNaN(coord.latitude) &&
      !isNaN(coord.longitude)

    // Check precision (more than 6 decimal places is considered high precision)
    const latPrecision = (coord.latitude.toString().split(".")[1] || "").length
    const lonPrecision = (coord.longitude.toString().split(".")[1] || "").length
    const isPrecise = latPrecision >= 4 && lonPrecision >= 4

    return { isValid, isPrecise }
  }

  /**
   * Assess overall data quality for a collection of features
   */
  static assessDataQuality(features: GeographicFeature[]): DataQualityMetrics {
    const validationResults = features.map((feature) => this.validateFeature(feature))

    const totalFeatures = features.length
    const validFeatures = validationResults.filter((result) => result.isValid).length
    const invalidFeatures = totalFeatures - validFeatures

    const completenessScore = this.calculateCompleteness(features)
    const accuracyScore = validationResults.reduce((sum, result) => sum + result.quality_score, 0) / totalFeatures
    const consistencyScore = this.calculateConsistency(features)

    const overallQuality = (completenessScore + accuracyScore + consistencyScore) / 3

    return {
      total_features: totalFeatures,
      valid_features: validFeatures,
      invalid_features: invalidFeatures,
      completeness_score: Math.round(completenessScore),
      accuracy_score: Math.round(accuracyScore),
      consistency_score: Math.round(consistencyScore),
      overall_quality: Math.round(overallQuality),
    }
  }

  /**
   * Calculate data completeness score
   */
  private static calculateCompleteness(features: GeographicFeature[]): number {
    if (features.length === 0) return 0

    let totalFields = 0
    let filledFields = 0

    features.forEach((feature) => {
      // Required fields
      totalFields += 4 // id, name, type, coordinates
      if (feature.id) filledFields++
      if (feature.name) filledFields++
      if (feature.type) filledFields++
      if (feature.coordinates) filledFields++

      // Optional but important fields
      totalFields += 2 // properties, metadata
      if (feature.properties && Object.keys(feature.properties).length > 0) filledFields++
      if (feature.metadata) filledFields++
    })

    return (filledFields / totalFields) * 100
  }

  /**
   * Calculate data consistency score
   */
  private static calculateConsistency(features: GeographicFeature[]): number {
    if (features.length === 0) return 100

    let consistencyScore = 100

    // Check for consistent property schemas
    const propertyKeys = new Set<string>()
    features.forEach((feature) => {
      if (feature.properties) {
        Object.keys(feature.properties).forEach((key) => propertyKeys.add(key))
      }
    })

    const avgPropertiesPerFeature = Array.from(propertyKeys).length / features.length
    if (avgPropertiesPerFeature < 0.5) {
      consistencyScore -= 20 // Inconsistent property schemas
    }

    // Check for consistent coordinate precision
    const precisions = features.map((feature) => {
      if (feature.type === "point") {
        const coord = feature.coordinates as Coordinates
        return Math.max(
          (coord.latitude.toString().split(".")[1] || "").length,
          (coord.longitude.toString().split(".")[1] || "").length,
        )
      }
      return 6 // Default precision
    })

    const precisionVariance = this.calculateVariance(precisions)
    if (precisionVariance > 4) {
      consistencyScore -= 15 // Inconsistent precision
    }

    return Math.max(0, consistencyScore)
  }

  /**
   * Calculate variance of an array of numbers
   */
  private static calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length
    const squaredDiffs = numbers.map((num) => Math.pow(num - mean, 2))
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length
  }
}
