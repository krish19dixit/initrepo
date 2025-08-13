// RAG system types and interfaces
import type { Coordinates, BoundingBox } from "../types/geographic"

export interface GeographicDocument {
  id: string
  content: string
  metadata: {
    type: "feature" | "analysis" | "report" | "observation"
    location?: Coordinates
    bounds?: BoundingBox
    timestamp: string
    source: string
    tags: string[]
    confidence?: number
  }
  embedding?: number[]
  spatialContext?: {
    nearbyFeatures: string[]
    region: string
    climate: string
    elevation?: number
  }
}

export interface VectorSearchResult {
  document: GeographicDocument
  similarity: number
  spatialRelevance: number
  combinedScore: number
}

export interface RAGQuery {
  text: string
  location?: Coordinates
  radius?: number // km
  filters?: {
    type?: string[]
    dateRange?: { start: string; end: string }
    tags?: string[]
    minConfidence?: number
  }
  spatialWeight?: number // 0-1, how much to weight spatial proximity
}

export interface RAGResponse {
  answer: string
  sources: VectorSearchResult[]
  spatialContext: {
    queryLocation?: Coordinates
    relevantRegions: string[]
    spatialScope: string
  }
  confidence: number
  metadata: {
    retrievalTime: number
    generationTime: number
    documentsRetrieved: number
    spatialFiltering: boolean
  }
}

export interface ChunkingStrategy {
  name: string
  chunkSize: number
  overlap: number
  preserveStructure: boolean
  spatialAware: boolean
}
