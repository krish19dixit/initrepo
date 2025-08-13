// Document processing and chunking for geographic data
import type { GeographicFeature } from "../types/geographic"
import type { ImageAnalysisResult } from "../imagery/image-processor"
import type { GeographicDocument, ChunkingStrategy } from "./types"

export class GeographicDocumentProcessor {
  /**
   * Convert geographic features to documents
   */
  static featuresToDocuments(features: GeographicFeature[]): GeographicDocument[] {
    return features.map((feature) => {
      const content = this.featureToText(feature)

      return {
        id: `feature-${feature.id}`,
        content,
        metadata: {
          type: "feature",
          location: feature.type === "point" ? (feature.coordinates as any) : undefined,
          bounds: feature.type !== "point" ? this.calculateFeatureBounds(feature) : undefined,
          timestamp: feature.metadata?.timestamp || new Date().toISOString(),
          source: feature.metadata?.source || "unknown",
          tags: this.extractFeatureTags(feature),
          confidence: feature.metadata?.accuracy ? feature.metadata.accuracy / 100 : undefined,
        },
        spatialContext: {
          nearbyFeatures: [],
          region: this.determineRegion(feature),
          climate: this.determineClimate(feature),
          elevation: feature.properties.elevation,
        },
      }
    })
  }

  /**
   * Convert image analysis results to documents
   */
  static analysisToDocuments(analysis: ImageAnalysisResult): GeographicDocument[] {
    const documents: GeographicDocument[] = []

    // Main analysis document
    const mainContent = this.analysisToText(analysis)
    documents.push({
      id: `analysis-${analysis.id}`,
      content: mainContent,
      metadata: {
        type: "analysis",
        timestamp: analysis.metadata.processingDate,
        source: "satellite_analysis",
        tags: ["satellite", "imagery", "analysis", ...analysis.metadata.algorithms.map((a) => a.toLowerCase())],
        confidence: analysis.metadata.confidence,
      },
    })

    // Feature-specific documents
    analysis.features.forEach((feature, index) => {
      const featureContent = this.extractedFeatureToText(feature)
      documents.push({
        id: `analysis-feature-${analysis.id}-${index}`,
        content: featureContent,
        metadata: {
          type: "analysis",
          bounds: feature.bounds,
          timestamp: analysis.metadata.processingDate,
          source: "satellite_analysis",
          tags: ["satellite", "feature", feature.type],
          confidence: feature.confidence,
        },
      })
    })

    return documents
  }

  /**
   * Chunk large documents using geographic-aware strategies
   */
  static chunkDocument(document: GeographicDocument, strategy: ChunkingStrategy): GeographicDocument[] {
    if (document.content.length <= strategy.chunkSize) {
      return [document]
    }

    const chunks: GeographicDocument[] = []
    const sentences = this.splitIntoSentences(document.content)

    let currentChunk = ""
    let chunkIndex = 0

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i]

      // Check if adding this sentence would exceed chunk size
      if (currentChunk.length + sentence.length > strategy.chunkSize && currentChunk.length > 0) {
        // Create chunk
        chunks.push({
          ...document,
          id: `${document.id}-chunk-${chunkIndex}`,
          content: currentChunk.trim(),
          metadata: {
            ...document.metadata,
            tags: [...document.metadata.tags, "chunk"],
          },
        })

        // Start new chunk with overlap if specified
        if (strategy.overlap > 0) {
          const overlapSentences = this.getOverlapSentences(sentences, i, strategy.overlap)
          currentChunk = overlapSentences.join(" ") + " "
        } else {
          currentChunk = ""
        }

        chunkIndex++
      }

      currentChunk += sentence + " "
    }

    // Add final chunk if there's remaining content
    if (currentChunk.trim().length > 0) {
      chunks.push({
        ...document,
        id: `${document.id}-chunk-${chunkIndex}`,
        content: currentChunk.trim(),
        metadata: {
          ...document.metadata,
          tags: [...document.metadata.tags, "chunk"],
        },
      })
    }

    return chunks
  }

  /**
   * Convert geographic feature to descriptive text
   */
  private static featureToText(feature: GeographicFeature): string {
    let text = `${feature.name} is a ${feature.type}`

    if (feature.type === "point") {
      const coords = feature.coordinates as any
      text += ` located at coordinates ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`
    }

    // Add properties
    const properties = Object.entries(feature.properties)
      .filter(([key, value]) => value !== null && value !== undefined)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ")

    if (properties) {
      text += `. Properties include: ${properties}`
    }

    // Add metadata
    if (feature.metadata?.source) {
      text += `. Data source: ${feature.metadata.source}`
    }

    return text
  }

  /**
   * Convert image analysis to descriptive text
   */
  private static analysisToText(analysis: ImageAnalysisResult): string {
    let text = `Satellite image analysis reveals the following characteristics:\n\n`

    // Land cover analysis
    text += `Land Cover Distribution:\n`
    text += `- Vegetation: ${analysis.landCover.vegetation_percent.toFixed(1)}%\n`
    text += `- Water: ${analysis.landCover.water_percent.toFixed(1)}%\n`
    text += `- Urban areas: ${analysis.landCover.urban_percent.toFixed(1)}%\n`
    text += `- Agriculture: ${analysis.landCover.agriculture_percent.toFixed(1)}%\n`
    text += `- Bare soil: ${analysis.landCover.bare_soil_percent.toFixed(1)}%\n\n`

    // Vegetation analysis
    text += `Vegetation Health:\n`
    text += `- NDVI mean: ${analysis.vegetation.ndvi_mean.toFixed(3)}\n`
    text += `- Vegetation health: ${analysis.vegetation.vegetation_health}\n`
    text += `- Forest cover: ${analysis.vegetation.forest_cover_percent.toFixed(1)}%\n\n`

    // Water analysis
    if (analysis.water.water_bodies.length > 0) {
      text += `Water Bodies:\n`
      analysis.water.water_bodies.forEach((wb) => {
        text += `- ${wb.type}: ${wb.area_km2.toFixed(2)} km²\n`
      })
      text += `- Water quality index: ${analysis.water.water_quality_index.toFixed(2)}\n\n`
    }

    // Image quality
    text += `Image Quality:\n`
    text += `- Overall quality: ${(analysis.statistics.overall.quality * 100).toFixed(1)}%\n`
    text += `- Cloud cover: ${(analysis.statistics.overall.cloudCover * 100).toFixed(1)}%\n`

    return text
  }

  /**
   * Convert extracted feature to text
   */
  private static extractedFeatureToText(feature: any): string {
    let text = `Detected ${feature.type} feature covering ${feature.area_km2.toFixed(2)} km²`
    text += ` with ${(feature.confidence * 100).toFixed(1)}% confidence.`

    if (feature.properties) {
      const props = Object.entries(feature.properties)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ")
      text += ` Additional properties: ${props}.`
    }

    return text
  }

  /**
   * Extract relevant tags from geographic feature
   */
  private static extractFeatureTags(feature: GeographicFeature): string[] {
    const tags = [feature.type]

    // Add property-based tags
    if (feature.properties.type) {
      tags.push(feature.properties.type)
    }

    if (feature.properties.state) {
      tags.push(feature.properties.state.toLowerCase())
    }

    if (feature.properties.country) {
      tags.push(feature.properties.country.toLowerCase())
    }

    // Add elevation-based tags
    if (feature.properties.elevation) {
      const elevation = feature.properties.elevation
      if (elevation > 3000) tags.push("high_altitude")
      else if (elevation > 1000) tags.push("medium_altitude")
      else tags.push("low_altitude")
    }

    return tags
  }

  /**
   * Determine region from feature location
   */
  private static determineRegion(feature: GeographicFeature): string {
    if (feature.properties.state && feature.properties.country) {
      return `${feature.properties.state}, ${feature.properties.country}`
    }

    if (feature.properties.country) {
      return feature.properties.country
    }

    // Fallback to coordinate-based region
    if (feature.type === "point") {
      const coords = feature.coordinates as any
      if (coords.latitude > 0) {
        return coords.longitude > 0 ? "Northern Hemisphere (East)" : "Northern Hemisphere (West)"
      } else {
        return coords.longitude > 0 ? "Southern Hemisphere (East)" : "Southern Hemisphere (West)"
      }
    }

    return "Unknown Region"
  }

  /**
   * Determine climate from feature location
   */
  private static determineClimate(feature: GeographicFeature): string {
    if (feature.type === "point") {
      const coords = feature.coordinates as any
      const absLat = Math.abs(coords.latitude)

      if (absLat > 66.5) return "polar"
      if (absLat > 40) return "temperate"
      if (absLat > 23.5) return "subtropical"
      return "tropical"
    }

    return "temperate" // Default
  }

  /**
   * Calculate bounding box for non-point features
   */
  private static calculateFeatureBounds(feature: GeographicFeature): any {
    let minLat = Number.POSITIVE_INFINITY,
      maxLat = Number.NEGATIVE_INFINITY
    let minLon = Number.POSITIVE_INFINITY,
      maxLon = Number.NEGATIVE_INFINITY

    const processCoord = (coord: any) => {
      minLat = Math.min(minLat, coord.latitude)
      maxLat = Math.max(maxLat, coord.latitude)
      minLon = Math.min(minLon, coord.longitude)
      maxLon = Math.max(maxLon, coord.longitude)
    }

    if (feature.type === "linestring") {
      ;(feature.coordinates as any[]).forEach(processCoord)
    } else if (feature.type === "polygon") {
      ;(feature.coordinates as any[][])[0].forEach(processCoord)
    }

    return { north: maxLat, south: minLat, east: maxLon, west: minLon }
  }

  /**
   * Split text into sentences
   */
  private static splitIntoSentences(text: string): string[] {
    return text.split(/[.!?]+/).filter((sentence) => sentence.trim().length > 0)
  }

  /**
   * Get overlap sentences for chunking
   */
  private static getOverlapSentences(sentences: string[], currentIndex: number, overlapSize: number): string[] {
    const start = Math.max(0, currentIndex - overlapSize)
    return sentences.slice(start, currentIndex)
  }
}
