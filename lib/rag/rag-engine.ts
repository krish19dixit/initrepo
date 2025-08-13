// Main RAG engine that orchestrates retrieval and generation
import { GeographicVectorStore } from "./vector-store"
import { MockEmbeddingProvider, GeographicEmbeddingEnhancer } from "./embeddings"
import type { RAGQuery, RAGResponse, GeographicDocument } from "./types"

export class GeographicRAGEngine {
  private vectorStore: GeographicVectorStore
  private embeddingProvider: MockEmbeddingProvider

  constructor() {
    this.vectorStore = new GeographicVectorStore({
      dimensions: 384,
      spatialWeight: 0.3,
      maxResults: 10,
    })
    this.embeddingProvider = new MockEmbeddingProvider()
  }

  /**
   * Initialize the RAG engine with geographic data
   */
  async initialize(documents: GeographicDocument[]): Promise<void> {
    console.log(`Initializing RAG engine with ${documents.length} documents...`)

    // Generate embeddings for documents that don't have them
    const documentsNeedingEmbeddings = documents.filter((doc) => !doc.embedding)

    if (documentsNeedingEmbeddings.length > 0) {
      console.log(`Generating embeddings for ${documentsNeedingEmbeddings.length} documents...`)

      const texts = documentsNeedingEmbeddings.map((doc) => doc.content)
      const embeddings = await this.embeddingProvider.generateBatchEmbeddings(texts)

      // Enhance embeddings with spatial context
      documentsNeedingEmbeddings.forEach((doc, index) => {
        const baseEmbedding = embeddings[index]
        doc.embedding = GeographicEmbeddingEnhancer.enhanceWithSpatialContext(baseEmbedding, doc)
      })
    }

    // Add all documents to vector store
    await this.vectorStore.addDocuments(documents)

    console.log("RAG engine initialized successfully")
  }

  /**
   * Query the RAG system
   */
  async query(query: RAGQuery): Promise<RAGResponse> {
    const startTime = Date.now()

    // Generate query embedding
    const queryEmbedding = await this.embeddingProvider.generateEmbedding(query.text)
    const retrievalTime = Date.now() - startTime

    // Search for relevant documents
    const searchResults = await this.vectorStore.search(queryEmbedding, query)

    // Generate response
    const generationStartTime = Date.now()
    const answer = await this.generateAnswer(query, searchResults)
    const generationTime = Date.now() - generationStartTime

    // Determine spatial context
    const spatialContext = this.analyzeSpatialContext(query, searchResults)

    // Calculate confidence based on search results
    const confidence = this.calculateConfidence(searchResults)

    return {
      answer,
      sources: searchResults,
      spatialContext,
      confidence,
      metadata: {
        retrievalTime,
        generationTime,
        documentsRetrieved: searchResults.length,
        spatialFiltering: !!query.location,
      },
    }
  }

  /**
   * Generate answer based on query and retrieved documents
   */
  private async generateAnswer(query: RAGQuery, sources: any[]): Promise<string> {
    if (sources.length === 0) {
      return "I don't have enough information to answer your question about this geographic area. Please try a different query or expand your search radius."
    }

    // Simple template-based generation (in real implementation, use LLM)
    let answer = `Based on the available geographic data, here's what I found:\n\n`

    // Categorize sources by type
    const featureSources = sources.filter((s) => s.document.metadata.type === "feature")
    const analysisSources = sources.filter((s) => s.document.metadata.type === "analysis")

    // Add feature information
    if (featureSources.length > 0) {
      answer += `Geographic Features:\n`
      featureSources.slice(0, 3).forEach((source, index) => {
        const doc = source.document
        answer += `${index + 1}. ${doc.content.split(".")[0]}.\n`
      })
      answer += "\n"
    }

    // Add analysis information
    if (analysisSources.length > 0) {
      answer += `Satellite Analysis Insights:\n`
      analysisSources.slice(0, 2).forEach((source, index) => {
        const doc = source.document
        const firstSentence = doc.content.split("\n")[0]
        answer += `${index + 1}. ${firstSentence}\n`
      })
      answer += "\n"
    }

    // Add spatial context if available
    if (query.location) {
      answer += `This information is relevant to the area around coordinates ${query.location.latitude.toFixed(4)}, ${query.location.longitude.toFixed(4)}`
      if (query.radius) {
        answer += ` within a ${query.radius}km radius`
      }
      answer += ".\n\n"
    }

    // Add confidence note
    const avgConfidence = sources.reduce((sum, s) => sum + s.combinedScore, 0) / sources.length
    if (avgConfidence < 0.7) {
      answer += `Note: This information has moderate confidence. Consider expanding your search or consulting additional sources.`
    }

    return answer
  }

  /**
   * Analyze spatial context of the query and results
   */
  private analyzeSpatialContext(query: RAGQuery, sources: any[]): any {
    const relevantRegions = new Set<string>()

    sources.forEach((source) => {
      if (source.document.spatialContext?.region) {
        relevantRegions.add(source.document.spatialContext.region)
      }
    })

    let spatialScope = "global"
    if (query.location) {
      if (query.radius && query.radius <= 10) spatialScope = "local"
      else if (query.radius && query.radius <= 100) spatialScope = "regional"
      else spatialScope = "national"
    }

    return {
      queryLocation: query.location,
      relevantRegions: Array.from(relevantRegions),
      spatialScope,
    }
  }

  /**
   * Calculate confidence score for the response
   */
  private calculateConfidence(sources: any[]): number {
    if (sources.length === 0) return 0

    const avgScore = sources.reduce((sum, s) => sum + s.combinedScore, 0) / sources.length
    const diversityBonus = Math.min(sources.length / 5, 1) * 0.1 // Bonus for having multiple sources

    return Math.min(1, avgScore + diversityBonus)
  }

  /**
   * Add new documents to the system
   */
  async addDocuments(documents: GeographicDocument[]): Promise<void> {
    // Generate embeddings for new documents
    const texts = documents.map((doc) => doc.content)
    const embeddings = await this.embeddingProvider.generateBatchEmbeddings(texts)

    documents.forEach((doc, index) => {
      const baseEmbedding = embeddings[index]
      doc.embedding = GeographicEmbeddingEnhancer.enhanceWithSpatialContext(baseEmbedding, doc)
    })

    await this.vectorStore.addDocuments(documents)
  }

  /**
   * Get system statistics
   */
  getStats(): any {
    return this.vectorStore.getStats()
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.vectorStore = new GeographicVectorStore({
      dimensions: 384,
      spatialWeight: 0.3,
      maxResults: 10,
    })
  }
}

export { GeographicRAGEngine as RAGEngine }
