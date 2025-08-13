// Natural language query parser for geographic queries
import type {
  ParsedQuery,
  QueryIntent,
  ExtractedEntity,
  SpatialConstraint,
  TemporalConstraint,
  Coordinates,
} from "./types"

export class GeographicQueryParser {
  private static readonly LOCATION_PATTERNS = [
    /\b(?:in|at|near|around|within)\s+([A-Z][a-zA-Z\s,]+?)(?:\s|$|,)/gi,
    /\b([A-Z][a-zA-Z\s]+(?:City|County|State|Province|Country|Park|Mountain|River|Lake))\b/gi,
    /\b(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\b/g, // Coordinates
  ]

  private static readonly DISTANCE_PATTERNS = [
    /\b(\d+(?:\.\d+)?)\s*(km|kilometers?|miles?|meters?|m)\b/gi,
    /\bwithin\s+(\d+(?:\.\d+)?)\s*(km|kilometers?|miles?|meters?|m)\b/gi,
  ]

  private static readonly TIME_PATTERNS = [
    /\b(last|past)\s+(\d+)\s+(days?|weeks?|months?|years?)\b/gi,
    /\b(before|after|since)\s+(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})\b/gi,
    /\b(between)\s+(\d{4}-\d{2}-\d{2})\s+and\s+(\d{4}-\d{2}-\d{2})\b/gi,
  ]

  private static readonly INTENT_KEYWORDS = {
    search: ["find", "search", "locate", "show", "list", "get"],
    compare: ["compare", "difference", "versus", "vs", "contrast"],
    analyze: ["analyze", "analysis", "examine", "study", "investigate"],
    describe: ["describe", "what is", "tell me about", "information about"],
    find_nearby: ["nearby", "close to", "around", "near", "within"],
    route: ["route", "path", "direction", "navigate", "travel"],
    change_detection: ["change", "changed", "difference", "evolution", "trend"],
  }

  private static readonly FEATURE_TYPES = [
    "city",
    "town",
    "village",
    "mountain",
    "river",
    "lake",
    "forest",
    "park",
    "building",
    "road",
    "highway",
    "airport",
    "hospital",
    "school",
    "restaurant",
    "vegetation",
    "water",
    "urban",
    "agriculture",
    "desert",
    "coastline",
  ]

  /**
   * Parse natural language query into structured format
   */
  static parseQuery(queryText: string): ParsedQuery {
    const normalizedQuery = queryText.toLowerCase().trim()

    // Extract intent
    const intent = this.extractIntent(normalizedQuery)

    // Extract entities
    const entities = this.extractEntities(queryText)

    // Extract spatial constraints
    const spatialConstraints = this.extractSpatialConstraints(queryText, entities)

    // Extract temporal constraints
    const temporalConstraints = this.extractTemporalConstraints(normalizedQuery)

    // Extract filters
    const filters = this.extractFilters(normalizedQuery)

    // Calculate overall confidence
    const confidence = this.calculateParsingConfidence(intent, entities, spatialConstraints)

    return {
      intent,
      entities,
      spatialConstraints,
      temporalConstraints,
      filters,
      confidence,
    }
  }

  /**
   * Extract query intent from text
   */
  private static extractIntent(queryText: string): QueryIntent {
    let bestMatch = { type: "search" as const, score: 0, subtype: undefined }

    Object.entries(this.INTENT_KEYWORDS).forEach(([intentType, keywords]) => {
      const score = keywords.reduce((sum, keyword) => {
        return sum + (queryText.includes(keyword) ? 1 : 0)
      }, 0)

      if (score > bestMatch.score) {
        bestMatch = { type: intentType as any, score, subtype: undefined }
      }
    })

    // Determine subtype based on content
    let subtype: string | undefined
    if (bestMatch.type === "search") {
      if (queryText.includes("satellite") || queryText.includes("imagery")) {
        subtype = "satellite_analysis"
      } else if (queryText.includes("feature") || queryText.includes("geographic")) {
        subtype = "geographic_features"
      }
    }

    return {
      type: bestMatch.type,
      subtype,
      description: this.generateIntentDescription(bestMatch.type, subtype),
    }
  }

  /**
   * Extract named entities from query text
   */
  private static extractEntities(queryText: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = []

    // Extract locations
    this.LOCATION_PATTERNS.forEach((pattern) => {
      let match
      while ((match = pattern.exec(queryText)) !== null) {
        if (match[1] && match[1].trim().length > 2) {
          entities.push({
            text: match[1].trim(),
            type: "location",
            value: match[1].trim(),
            confidence: 0.8,
            position: { start: match.index, end: match.index + match[0].length },
          })
        }
      }
    })

    // Extract coordinates
    const coordPattern = /\b(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\b/g
    let coordMatch
    while ((coordMatch = coordPattern.exec(queryText)) !== null) {
      const lat = Number.parseFloat(coordMatch[1])
      const lon = Number.parseFloat(coordMatch[2])

      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        entities.push({
          text: coordMatch[0],
          type: "location",
          value: { latitude: lat, longitude: lon },
          confidence: 0.95,
          position: { start: coordMatch.index, end: coordMatch.index + coordMatch[0].length },
        })
      }
    }

    // Extract feature types
    this.FEATURE_TYPES.forEach((featureType) => {
      const regex = new RegExp(`\\b${featureType}s?\\b`, "gi")
      let match
      while ((match = regex.exec(queryText)) !== null) {
        entities.push({
          text: match[0],
          type: "feature_type",
          value: featureType,
          confidence: 0.9,
          position: { start: match.index, end: match.index + match[0].length },
        })
      }
    })

    // Extract measurements
    this.DISTANCE_PATTERNS.forEach((pattern) => {
      let match
      while ((match = pattern.exec(queryText)) !== null) {
        const value = Number.parseFloat(match[1])
        const unit = match[2].toLowerCase()

        entities.push({
          text: match[0],
          type: "measurement",
          value: { distance: value, unit: this.normalizeUnit(unit) },
          confidence: 0.95,
          position: { start: match.index, end: match.index + match[0].length },
        })
      }
    })

    return entities
  }

  /**
   * Extract spatial constraints from query and entities
   */
  private static extractSpatialConstraints(queryText: string, entities: ExtractedEntity[]): SpatialConstraint[] {
    const constraints: SpatialConstraint[] = []

    // Find location entities
    const locationEntities = entities.filter((e) => e.type === "location")
    const measurementEntities = entities.filter((e) => e.type === "measurement")

    locationEntities.forEach((locationEntity) => {
      if (typeof locationEntity.value === "object" && "latitude" in locationEntity.value) {
        // Coordinate-based constraint
        const coords = locationEntity.value as Coordinates

        // Check if there's a distance measurement nearby
        const nearbyMeasurement = measurementEntities.find(
          (m) => Math.abs(m.position.start - locationEntity.position.end) < 50,
        )

        if (nearbyMeasurement) {
          constraints.push({
            type: "radius",
            geometry: coords,
            parameters: {
              radius: nearbyMeasurement.value.distance,
              unit: nearbyMeasurement.value.unit,
            },
          })
        } else {
          constraints.push({
            type: "point",
            geometry: coords,
          })
        }
      } else {
        // Named location constraint
        constraints.push({
          type: "within",
          geometry: { latitude: 0, longitude: 0 }, // Placeholder - would resolve in real implementation
          parameters: {
            locationName: locationEntity.value,
          },
        })
      }
    })

    // Extract "nearby" or "around" patterns
    if (queryText.includes("nearby") || queryText.includes("around") || queryText.includes("near")) {
      const defaultRadius = measurementEntities.length > 0 ? measurementEntities[0].value.distance : 10 // Default 10km

      if (locationEntities.length > 0) {
        const location = locationEntities[0]
        if (typeof location.value === "object" && "latitude" in location.value) {
          constraints.push({
            type: "radius",
            geometry: location.value as Coordinates,
            parameters: {
              radius: defaultRadius,
              unit: "km",
            },
          })
        }
      }
    }

    return constraints
  }

  /**
   * Extract temporal constraints from query
   */
  private static extractTemporalConstraints(queryText: string): TemporalConstraint[] {
    const constraints: TemporalConstraint[] = []

    // Extract relative time patterns
    this.TIME_PATTERNS.forEach((pattern) => {
      let match
      while ((match = pattern.exec(queryText)) !== null) {
        if (match[1] === "last" || match[1] === "past") {
          const amount = Number.parseInt(match[2])
          const unit = match[3]
          const endDate = new Date()
          const startDate = new Date()

          switch (unit.toLowerCase()) {
            case "days":
            case "day":
              startDate.setDate(startDate.getDate() - amount)
              break
            case "weeks":
            case "week":
              startDate.setDate(startDate.getDate() - amount * 7)
              break
            case "months":
            case "month":
              startDate.setMonth(startDate.getMonth() - amount)
              break
            case "years":
            case "year":
              startDate.setFullYear(startDate.getFullYear() - amount)
              break
          }

          constraints.push({
            type: "between",
            startDate: startDate.toISOString().split("T")[0],
            endDate: endDate.toISOString().split("T")[0],
          })
        }
      }
    })

    return constraints
  }

  /**
   * Extract query filters
   */
  private static extractFilters(queryText: string): any[] {
    const filters: any[] = []

    // Extract type filters
    if (queryText.includes("type:") || queryText.includes("category:")) {
      const typeMatch = queryText.match(/(?:type|category):\s*([a-zA-Z_]+)/i)
      if (typeMatch) {
        filters.push({
          field: "type",
          operator: "equals",
          value: typeMatch[1],
        })
      }
    }

    // Extract confidence filters
    if (queryText.includes("confidence") || queryText.includes("accuracy")) {
      const confMatch = queryText.match(/(?:confidence|accuracy)\s*(?:>|above|greater than)\s*(\d+(?:\.\d+)?)/i)
      if (confMatch) {
        filters.push({
          field: "confidence",
          operator: "greater_than",
          value: Number.parseFloat(confMatch[1]),
        })
      }
    }

    return filters
  }

  /**
   * Calculate parsing confidence based on extracted components
   */
  private static calculateParsingConfidence(
    intent: QueryIntent,
    entities: ExtractedEntity[],
    spatialConstraints: SpatialConstraint[],
  ): number {
    let confidence = 0.5 // Base confidence

    // Boost confidence for clear intent
    if (intent.type !== "search" || intent.subtype) {
      confidence += 0.2
    }

    // Boost confidence for extracted entities
    confidence += Math.min(entities.length * 0.1, 0.3)

    // Boost confidence for spatial constraints
    confidence += Math.min(spatialConstraints.length * 0.15, 0.3)

    // Boost confidence for high-confidence entities
    const avgEntityConfidence =
      entities.length > 0 ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length : 0
    confidence += avgEntityConfidence * 0.2

    return Math.min(confidence, 1.0)
  }

  /**
   * Generate intent description
   */
  private static generateIntentDescription(type: string, subtype?: string): string {
    const descriptions: Record<string, string> = {
      search: "Search for geographic information",
      compare: "Compare geographic features or areas",
      analyze: "Analyze geographic data or patterns",
      describe: "Describe geographic features or locations",
      find_nearby: "Find nearby geographic features",
      route: "Find routes or directions",
      change_detection: "Detect changes over time",
    }

    let description = descriptions[type] || "Process geographic query"

    if (subtype) {
      description += ` (${subtype.replace("_", " ")})`
    }

    return description
  }

  /**
   * Normalize distance units
   */
  private static normalizeUnit(unit: string): "km" | "miles" | "meters" {
    const normalized = unit.toLowerCase()
    if (normalized.includes("mile")) return "miles"
    if (normalized.includes("meter") || normalized === "m") return "meters"
    return "km"
  }
}
