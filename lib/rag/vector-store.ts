// In-memory vector database with spatial awareness
import type { GeographicDocument, VectorSearchResult, RAGQuery } from "./types"
import { calculateDistance } from "../spatial/utils"

export interface VectorStoreOptions {
  dimensions: number
  spatialWeight: number
  maxResults: number
}

export class GeographicVectorStore {
  private documents: Map<string, GeographicDocument> = new Map()
  private embeddings: Map<string, number[]> = new Map()
  private spatialIndex: Map<string, string[]> = new Map() // Grid-based spatial index
  private options: VectorStoreOptions

  constructor(options: Partial<VectorStoreOptions> = {}) {
    this.options = {
      dimensions: 384,
      spatialWeight: 0.3,
      maxResults: 10,
      ...options,
    }
  }

  /**
   * Add a document to the vector store
   */
  async addDocument(document: GeographicDocument): Promise<void> {
    this.documents.set(document.id, document)

    if (document.embedding) {
      this.embeddings.set(document.id, document.embedding)
    }

    // Add to spatial index if location is available
    if (document.metadata.location) {
      this.addToSpatialIndex(document.id, document.metadata.location)
    }
  }

  /**
   * Add multiple documents in batch
   */
  async addDocuments(documents: GeographicDocument[]): Promise<void> {
    await Promise.all(documents.map((doc) => this.addDocument(doc)))
  }

  /**
   * Search for similar documents
   */
  async search(queryEmbedding: number[], query: RAGQuery): Promise<VectorSearchResult[]> {
    const candidates = this.getCandidateDocuments(query)
    const results: VectorSearchResult[] = []

    for (const docId of candidates) {
      const document = this.documents.get(docId)
      const embedding = this.embeddings.get(docId)

      if (!document || !embedding) continue

      // Calculate semantic similarity
      const similarity = this.cosineSimilarity(queryEmbedding, embedding)

      // Calculate spatial relevance
      const spatialRelevance = this.calculateSpatialRelevance(document, query)

      // Combine scores
      const combinedScore = this.combineScores(
        similarity,
        spatialRelevance,
        query.spatialWeight || this.options.spatialWeight,
      )

      results.push({
        document,
        similarity,
        spatialRelevance,
        combinedScore,
      })
    }

    // Sort by combined score and return top results
    return results.sort((a, b) => b.combinedScore - a.combinedScore).slice(0, this.options.maxResults)
  }

  /**
   * Get candidate documents based on filters and spatial constraints
   */
  private getCandidateDocuments(query: RAGQuery): string[] {
    let candidates = new Set<string>()

    // Start with all documents if no spatial constraint
    if (!query.location) {
      candidates = new Set(this.documents.keys())
    } else {
      // Get spatially relevant documents
      const spatialCandidates = this.getSpatialCandidates(query.location, query.radius || 100)
      candidates = new Set(spatialCandidates)

      // If no spatial candidates found, fall back to all documents
      if (candidates.size === 0) {
        candidates = new Set(this.documents.keys())
      }
    }

    // Apply filters
    if (query.filters) {
      candidates = new Set(
        [...candidates].filter((docId) => {
          const document = this.documents.get(docId)
          if (!document) return false

          // Type filter
          if (query.filters!.type && !query.filters!.type.includes(document.metadata.type)) {
            return false
          }

          // Date range filter
          if (query.filters!.dateRange) {
            const docDate = new Date(document.metadata.timestamp)
            const startDate = new Date(query.filters!.dateRange.start)
            const endDate = new Date(query.filters!.dateRange.end)
            if (docDate < startDate || docDate > endDate) {
              return false
            }
          }

          // Tags filter
          if (query.filters!.tags) {
            const hasRequiredTags = query.filters!.tags.some((tag) => document.metadata.tags.includes(tag))
            if (!hasRequiredTags) return false
          }

          // Confidence filter
          if (
            query.filters!.minConfidence &&
            document.metadata.confidence &&
            document.metadata.confidence < query.filters!.minConfidence
          ) {
            return false
          }

          return true
        }),
      )
    }

    return [...candidates]
  }

  /**
   * Get spatially relevant document IDs
   */
  private getSpatialCandidates(location: { latitude: number; longitude: number }, radiusKm: number): string[] {
    const candidates: string[] = []
    const gridSize = 0.1 // ~10km grid cells

    // Calculate grid bounds for the search radius
    const latRange = radiusKm / 111 // Approximate km per degree latitude
    const lonRange = radiusKm / (111 * Math.cos((location.latitude * Math.PI) / 180))

    const minGridX = Math.floor((location.longitude - lonRange) / gridSize)
    const maxGridX = Math.ceil((location.longitude + lonRange) / gridSize)
    const minGridY = Math.floor((location.latitude - latRange) / gridSize)
    const maxGridY = Math.ceil((location.latitude + latRange) / gridSize)

    // Collect candidates from relevant grid cells
    for (let x = minGridX; x <= maxGridX; x++) {
      for (let y = minGridY; y <= maxGridY; y++) {
        const gridKey = `${x},${y}`
        const cellDocs = this.spatialIndex.get(gridKey) || []
        candidates.push(...cellDocs)
      }
    }

    // Filter by actual distance
    return candidates.filter((docId) => {
      const document = this.documents.get(docId)
      if (!document?.metadata.location) return false

      const distance = calculateDistance(location, document.metadata.location)
      return distance <= radiusKm
    })
  }

  /**
   * Add document to spatial index
   */
  private addToSpatialIndex(docId: string, location: { latitude: number; longitude: number }): void {
    const gridSize = 0.1
    const gridX = Math.floor(location.longitude / gridSize)
    const gridY = Math.floor(location.latitude / gridSize)
    const gridKey = `${gridX},${gridY}`

    if (!this.spatialIndex.has(gridKey)) {
      this.spatialIndex.set(gridKey, [])
    }

    this.spatialIndex.get(gridKey)!.push(docId)
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have the same length")
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  /**
   * Calculate spatial relevance score
   */
  private calculateSpatialRelevance(document: GeographicDocument, query: RAGQuery): number {
    if (!query.location || !document.metadata.location) {
      return 0.5 // Neutral score when no spatial context
    }

    const distance = calculateDistance(query.location, document.metadata.location)
    const maxDistance = query.radius || 100 // Default 100km

    // Exponential decay with distance
    return Math.exp(-distance / (maxDistance / 3))
  }

  /**
   * Combine semantic and spatial scores
   */
  private combineScores(similarity: number, spatialRelevance: number, spatialWeight: number): number {
    return (1 - spatialWeight) * similarity + spatialWeight * spatialRelevance
  }

  /**
   * Get document by ID
   */
  getDocument(id: string): GeographicDocument | undefined {
    return this.documents.get(id)
  }

  /**
   * Get all documents
   */
  getAllDocuments(): GeographicDocument[] {
    return Array.from(this.documents.values())
  }

  /**
   * Remove document
   */
  removeDocument(id: string): boolean {
    const document = this.documents.get(id)
    if (!document) return false

    this.documents.delete(id)
    this.embeddings.delete(id)

    // Remove from spatial index
    if (document.metadata.location) {
      this.removeFromSpatialIndex(id, document.metadata.location)
    }

    return true
  }

  /**
   * Remove document from spatial index
   */
  private removeFromSpatialIndex(docId: string, location: { latitude: number; longitude: number }): void {
    const gridSize = 0.1
    const gridX = Math.floor(location.longitude / gridSize)
    const gridY = Math.floor(location.latitude / gridSize)
    const gridKey = `${gridX},${gridY}`

    const cellDocs = this.spatialIndex.get(gridKey)
    if (cellDocs) {
      const index = cellDocs.indexOf(docId)
      if (index > -1) {
        cellDocs.splice(index, 1)
        if (cellDocs.length === 0) {
          this.spatialIndex.delete(gridKey)
        }
      }
    }
  }

  /**
   * Get statistics about the vector store
   */
  getStats(): {
    totalDocuments: number
    documentsWithEmbeddings: number
    documentsWithLocation: number
    spatialGridCells: number
  } {
    const documentsWithLocation = Array.from(this.documents.values()).filter((doc) => doc.metadata.location).length

    return {
      totalDocuments: this.documents.size,
      documentsWithEmbeddings: this.embeddings.size,
      documentsWithLocation,
      spatialGridCells: this.spatialIndex.size,
    }
  }
}
