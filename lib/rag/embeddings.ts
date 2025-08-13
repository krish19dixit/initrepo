// Embedding generation and management
import type { GeographicDocument } from "./types"

export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>
  generateBatchEmbeddings(texts: string[]): Promise<number[][]>
  getDimensions(): number
}

export class MockEmbeddingProvider implements EmbeddingProvider {
  private dimensions = 384 // Typical for sentence transformers

  async generateEmbedding(text: string): Promise<number[]> {
    // Mock embedding generation - in real implementation, use OpenAI, HuggingFace, etc.
    await new Promise((resolve) => setTimeout(resolve, 100)) // Simulate API call

    // Generate deterministic but varied embeddings based on text content
    const hash = this.simpleHash(text)
    const embedding = Array(this.dimensions)
      .fill(0)
      .map((_, i) => {
        const seed = hash + i
        return (Math.sin(seed) + Math.cos(seed * 1.5) + Math.sin(seed * 2.3)) / 3
      })

    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    return embedding.map((val) => val / magnitude)
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    // Process in batches to simulate real API behavior
    const batchSize = 10
    const results: number[][] = []

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)
      const batchEmbeddings = await Promise.all(batch.map((text) => this.generateEmbedding(text)))
      results.push(...batchEmbeddings)
    }

    return results
  }

  getDimensions(): number {
    return this.dimensions
  }

  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }
}

export class GeographicEmbeddingEnhancer {
  /**
   * Enhance text embeddings with spatial context
   */
  static enhanceWithSpatialContext(textEmbedding: number[], document: GeographicDocument): number[] {
    const enhanced = [...textEmbedding]

    // Add spatial features to embedding
    if (document.metadata.location) {
      const spatialFeatures = this.extractSpatialFeatures(document)

      // Append spatial features to the embedding (simple concatenation)
      enhanced.push(...spatialFeatures)
    }

    return enhanced
  }

  /**
   * Extract spatial features for embedding enhancement
   */
  private static extractSpatialFeatures(document: GeographicDocument): number[] {
    const features: number[] = []

    if (document.metadata.location) {
      const { latitude, longitude } = document.metadata.location

      // Normalize coordinates to [-1, 1] range
      features.push(latitude / 90)
      features.push(longitude / 180)

      // Add derived spatial features
      features.push(Math.sin((latitude * Math.PI) / 180)) // Latitude sine
      features.push(Math.cos((latitude * Math.PI) / 180)) // Latitude cosine
      features.push(Math.sin((longitude * Math.PI) / 180)) // Longitude sine
      features.push(Math.cos((longitude * Math.PI) / 180)) // Longitude cosine
    }

    // Add elevation if available
    if (document.spatialContext?.elevation) {
      features.push(Math.tanh(document.spatialContext.elevation / 5000)) // Normalize elevation
    } else {
      features.push(0)
    }

    // Add climate encoding
    if (document.spatialContext?.climate) {
      const climateEncoding = this.encodeClimate(document.spatialContext.climate)
      features.push(...climateEncoding)
    } else {
      features.push(0, 0, 0) // Default climate encoding
    }

    return features
  }

  /**
   * Encode climate information as numerical features
   */
  private static encodeClimate(climate: string): number[] {
    const climateMap: Record<string, number[]> = {
      tropical: [1, 0, 0],
      temperate: [0, 1, 0],
      polar: [0, 0, 1],
      arid: [0.5, 0.5, 0],
      mediterranean: [0.7, 0.3, 0],
    }

    return climateMap[climate.toLowerCase()] || [0, 0, 0]
  }
}
