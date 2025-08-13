// Query execution engine that orchestrates spatial operations
import type { ParsedQuery, QueryExecutionPlan, ExecutionStep, QueryResult } from "./types"
import type { RAGQuery } from "../rag/types"
import type { GeographicRAGEngine } from "../rag/rag-engine"
import type { QuadTreeSpatialIndex } from "../spatial/spatial-index"
import { calculateDistance } from "../spatial/utils"

export class QueryExecutor {
  private ragEngine: GeographicRAGEngine
  private spatialIndex: QuadTreeSpatialIndex
  private queryCache: Map<string, { result: QueryResult; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  constructor(ragEngine: GeographicRAGEngine, spatialIndex: QuadTreeSpatialIndex) {
    this.ragEngine = ragEngine
    this.spatialIndex = spatialIndex
  }

  /**
   * Execute a parsed query
   */
  async executeQuery(parsedQuery: ParsedQuery, originalText: string): Promise<QueryResult> {
    const startTime = Date.now()

    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(parsedQuery, originalText)

      // Check cache
      const cached = this.checkCache(cacheKey)
      if (cached) {
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            cacheHit: true,
          },
        }
      }

      // Create execution plan
      const executionPlan = this.createExecutionPlan(parsedQuery)

      // Execute plan
      const result = await this.executePlan(executionPlan, parsedQuery, originalText)

      // Cache result
      this.cacheResult(cacheKey, result)

      return {
        ...result,
        metadata: {
          ...result.metadata,
          executionTime: Date.now() - startTime,
          cacheHit: false,
        },
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        metadata: {
          executionTime: Date.now() - startTime,
          stepsExecuted: 0,
          cacheHit: false,
          confidence: 0,
        },
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  }

  /**
   * Create execution plan based on parsed query
   */
  private createExecutionPlan(parsedQuery: ParsedQuery): QueryExecutionPlan {
    const steps: ExecutionStep[] = []
    let estimatedCost = 1

    // Step 1: Spatial filtering (if spatial constraints exist)
    if (parsedQuery.spatialConstraints.length > 0) {
      steps.push({
        id: "spatial_filter",
        type: "spatial_filter",
        operation: "filter_by_spatial_constraints",
        parameters: {
          constraints: parsedQuery.spatialConstraints,
        },
        dependencies: [],
      })
      estimatedCost += 2
    }

    // Step 2: RAG search
    steps.push({
      id: "rag_search",
      type: "rag_search",
      operation: "semantic_search",
      parameters: {
        intent: parsedQuery.intent,
        entities: parsedQuery.entities,
        filters: parsedQuery.filters,
        temporalConstraints: parsedQuery.temporalConstraints,
      },
      dependencies: parsedQuery.spatialConstraints.length > 0 ? ["spatial_filter"] : [],
    })
    estimatedCost += 5

    // Step 3: Analysis (if analysis intent)
    if (parsedQuery.intent.type === "analyze" || parsedQuery.intent.type === "compare") {
      steps.push({
        id: "analysis",
        type: "analysis",
        operation: parsedQuery.intent.type === "compare" ? "compare_features" : "analyze_features",
        parameters: {
          analysisType: parsedQuery.intent.subtype || "general",
        },
        dependencies: ["rag_search"],
      })
      estimatedCost += 3
    }

    // Step 4: Aggregation (if multiple results expected)
    if (parsedQuery.intent.type === "search" && parsedQuery.entities.length > 1) {
      steps.push({
        id: "aggregation",
        type: "aggregation",
        operation: "aggregate_results",
        parameters: {
          groupBy: "type",
        },
        dependencies: ["rag_search"],
      })
      estimatedCost += 1
    }

    return {
      steps,
      estimatedCost,
      cacheKey: this.generateCacheKey(parsedQuery, ""),
    }
  }

  /**
   * Execute the query plan
   */
  private async executePlan(
    plan: QueryExecutionPlan,
    parsedQuery: ParsedQuery,
    originalText: string,
  ): Promise<QueryResult> {
    const executedSteps: Record<string, any> = {}
    let stepsExecuted = 0

    for (const step of plan.steps) {
      // Check dependencies
      const dependenciesMet = step.dependencies.every((dep) => executedSteps[dep] !== undefined)
      if (!dependenciesMet) {
        throw new Error(`Dependencies not met for step ${step.id}`)
      }

      // Execute step
      const stepResult = await this.executeStep(step, executedSteps, parsedQuery, originalText)
      executedSteps[step.id] = stepResult
      stepsExecuted++
    }

    // Get final result
    const finalResult = this.getFinalResult(executedSteps, plan, parsedQuery)

    return {
      success: true,
      data: finalResult,
      metadata: {
        executionTime: 0, // Will be set by caller
        stepsExecuted,
        cacheHit: false,
        confidence: this.calculateResultConfidence(finalResult, parsedQuery),
      },
    }
  }

  /**
   * Execute individual step
   */
  private async executeStep(
    step: ExecutionStep,
    previousResults: Record<string, any>,
    parsedQuery: ParsedQuery,
    originalText: string,
  ): Promise<any> {
    switch (step.type) {
      case "spatial_filter":
        return this.executeSpatialFilter(step, parsedQuery)

      case "rag_search":
        return this.executeRAGSearch(step, parsedQuery, originalText, previousResults)

      case "analysis":
        return this.executeAnalysis(step, previousResults)

      case "aggregation":
        return this.executeAggregation(step, previousResults)

      default:
        throw new Error(`Unknown step type: ${step.type}`)
    }
  }

  /**
   * Execute spatial filtering step
   */
  private async executeSpatialFilter(step: ExecutionStep, parsedQuery: ParsedQuery): Promise<any> {
    const constraints = step.parameters.constraints
    const results: any[] = []

    for (const constraint of constraints) {
      switch (constraint.type) {
        case "point":
          // Find features at specific point
          const pointFeatures = this.spatialIndex.queryRadius(constraint.geometry as any, 1) // 1km radius
          results.push(...pointFeatures)
          break

        case "radius":
          // Find features within radius
          const radiusFeatures = this.spatialIndex.queryRadius(
            constraint.geometry as any,
            constraint.parameters?.radius || 10,
          )
          results.push(...radiusFeatures)
          break

        case "bounds":
          // Find features within bounding box
          const boundsFeatures = this.spatialIndex.query(constraint.geometry as any)
          results.push(...boundsFeatures)
          break
      }
    }

    return {
      spatiallyFilteredFeatures: results,
      constraintsApplied: constraints.length,
    }
  }

  /**
   * Execute RAG search step
   */
  private async executeRAGSearch(
    step: ExecutionStep,
    parsedQuery: ParsedQuery,
    originalText: string,
    previousResults: Record<string, any>,
  ): Promise<any> {
    // Build RAG query
    const ragQuery: RAGQuery = {
      text: originalText,
      spatialWeight: 0.3,
    }

    // Add spatial constraints from previous steps
    if (previousResults.spatial_filter) {
      const spatialData = previousResults.spatial_filter
      if (spatialData.spatiallyFilteredFeatures.length > 0) {
        // Use first feature's location as query location
        const firstFeature = spatialData.spatiallyFilteredFeatures[0]
        if (firstFeature.coordinates) {
          ragQuery.location = firstFeature.coordinates
          ragQuery.radius = 50 // Default 50km radius
        }
      }
    } else if (parsedQuery.spatialConstraints.length > 0) {
      // Use spatial constraints directly
      const firstConstraint = parsedQuery.spatialConstraints[0]
      if (firstConstraint.type === "point" || firstConstraint.type === "radius") {
        ragQuery.location = firstConstraint.geometry as any
        ragQuery.radius = firstConstraint.parameters?.radius || 50
      }
    }

    // Add filters
    if (parsedQuery.filters.length > 0 || parsedQuery.temporalConstraints.length > 0) {
      ragQuery.filters = {}

      // Add type filters
      const typeFilters = parsedQuery.filters.filter((f) => f.field === "type")
      if (typeFilters.length > 0) {
        ragQuery.filters.type = typeFilters.map((f) => f.value)
      }

      // Add temporal filters
      if (parsedQuery.temporalConstraints.length > 0) {
        const temporal = parsedQuery.temporalConstraints[0]
        if (temporal.startDate && temporal.endDate) {
          ragQuery.filters.dateRange = {
            start: temporal.startDate,
            end: temporal.endDate,
          }
        }
      }

      // Add confidence filters
      const confFilters = parsedQuery.filters.filter((f) => f.field === "confidence")
      if (confFilters.length > 0) {
        ragQuery.filters.minConfidence = confFilters[0].value
      }
    }

    // Execute RAG query
    const ragResponse = await this.ragEngine.query(ragQuery)

    return {
      ragResponse,
      queryUsed: ragQuery,
    }
  }

  /**
   * Execute analysis step
   */
  private async executeAnalysis(step: ExecutionStep, previousResults: Record<string, any>): Promise<any> {
    const ragResult = previousResults.rag_search
    if (!ragResult || !ragResult.ragResponse) {
      return { analysis: "No data available for analysis" }
    }

    const sources = ragResult.ragResponse.sources
    const analysisType = step.parameters.analysisType

    switch (step.operation) {
      case "analyze_features":
        return this.analyzeFeatures(sources, analysisType)

      case "compare_features":
        return this.compareFeatures(sources, analysisType)

      default:
        return { analysis: "Analysis type not supported" }
    }
  }

  /**
   * Execute aggregation step
   */
  private async executeAggregation(step: ExecutionStep, previousResults: Record<string, any>): Promise<any> {
    const ragResult = previousResults.rag_search
    if (!ragResult || !ragResult.ragResponse) {
      return { aggregation: "No data available for aggregation" }
    }

    const sources = ragResult.ragResponse.sources
    const groupBy = step.parameters.groupBy

    // Group sources by specified field
    const grouped = sources.reduce((groups: Record<string, any[]>, source: any) => {
      const key = source.document.metadata[groupBy] || "unknown"
      if (!groups[key]) groups[key] = []
      groups[key].push(source)
      return groups
    }, {})

    // Calculate statistics for each group
    const aggregated = Object.entries(grouped).map(([key, items]) => ({
      category: key,
      count: items.length,
      avgConfidence: items.reduce((sum: number, item: any) => sum + item.combinedScore, 0) / items.length,
      items: items.slice(0, 3), // Top 3 items per category
    }))

    return {
      aggregation: aggregated,
      totalGroups: Object.keys(grouped).length,
      totalItems: sources.length,
    }
  }

  /**
   * Analyze features
   */
  private analyzeFeatures(sources: any[], analysisType: string): any {
    if (sources.length === 0) {
      return { analysis: "No features found for analysis" }
    }

    const analysis: any = {
      totalFeatures: sources.length,
      avgConfidence: sources.reduce((sum, s) => sum + s.combinedScore, 0) / sources.length,
      featureTypes: {},
      spatialDistribution: {},
    }

    // Analyze feature types
    sources.forEach((source) => {
      const type = source.document.metadata.type
      analysis.featureTypes[type] = (analysis.featureTypes[type] || 0) + 1
    })

    // Analyze spatial distribution
    const locatedSources = sources.filter((s) => s.document.metadata.location)
    if (locatedSources.length > 0) {
      const lats = locatedSources.map((s) => s.document.metadata.location.latitude)
      const lons = locatedSources.map((s) => s.document.metadata.location.longitude)

      analysis.spatialDistribution = {
        center: {
          latitude: lats.reduce((sum, lat) => sum + lat, 0) / lats.length,
          longitude: lons.reduce((sum, lon) => sum + lon, 0) / lons.length,
        },
        spread: {
          latRange: Math.max(...lats) - Math.min(...lats),
          lonRange: Math.max(...lons) - Math.min(...lons),
        },
      }
    }

    return { analysis }
  }

  /**
   * Compare features
   */
  private compareFeatures(sources: any[], analysisType: string): any {
    if (sources.length < 2) {
      return { comparison: "Need at least 2 features for comparison" }
    }

    const comparison: any = {
      featuresCompared: sources.length,
      similarities: [],
      differences: [],
    }

    // Compare first two features in detail
    const feature1 = sources[0]
    const feature2 = sources[1]

    // Similarity comparison
    comparison.similarities.push({
      aspect: "confidence",
      feature1: feature1.combinedScore,
      feature2: feature2.combinedScore,
      difference: Math.abs(feature1.combinedScore - feature2.combinedScore),
    })

    // Type comparison
    const type1 = feature1.document.metadata.type
    const type2 = feature2.document.metadata.type
    comparison.differences.push({
      aspect: "type",
      feature1: type1,
      feature2: type2,
      same: type1 === type2,
    })

    // Spatial comparison
    if (feature1.document.metadata.location && feature2.document.metadata.location) {
      const distance = calculateDistance(feature1.document.metadata.location, feature2.document.metadata.location)
      comparison.differences.push({
        aspect: "distance",
        value: distance,
        unit: "km",
      })
    }

    return { comparison }
  }

  /**
   * Get final result from executed steps
   */
  private getFinalResult(executedSteps: Record<string, any>, plan: QueryExecutionPlan, parsedQuery: ParsedQuery): any {
    // The main result usually comes from the RAG search
    const ragResult = executedSteps.rag_search
    if (!ragResult) {
      return { error: "No search results available" }
    }

    const result: any = {
      answer: ragResult.ragResponse.answer,
      sources: ragResult.ragResponse.sources,
      spatialContext: ragResult.ragResponse.spatialContext,
      queryIntent: parsedQuery.intent,
    }

    // Add analysis results if available
    if (executedSteps.analysis) {
      result.analysis = executedSteps.analysis
    }

    // Add aggregation results if available
    if (executedSteps.aggregation) {
      result.aggregation = executedSteps.aggregation
    }

    // Add spatial filtering results if available
    if (executedSteps.spatial_filter) {
      result.spatialFiltering = executedSteps.spatial_filter
    }

    return result
  }

  /**
   * Calculate result confidence
   */
  private calculateResultConfidence(result: any, parsedQuery: ParsedQuery): number {
    let confidence = parsedQuery.confidence * 0.3 // Base on parsing confidence

    if (result.sources && result.sources.length > 0) {
      const avgSourceConfidence =
        result.sources.reduce((sum: number, s: any) => sum + s.combinedScore, 0) / result.sources.length
      confidence += avgSourceConfidence * 0.5
    }

    if (result.analysis) {
      confidence += 0.1 // Boost for having analysis
    }

    if (result.spatialContext && result.spatialContext.queryLocation) {
      confidence += 0.1 // Boost for spatial context
    }

    return Math.min(confidence, 1.0)
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(parsedQuery: ParsedQuery, originalText: string): string {
    const keyData = {
      intent: parsedQuery.intent.type,
      entities: parsedQuery.entities.map((e) => e.text).sort(),
      spatial: parsedQuery.spatialConstraints.length,
      temporal: parsedQuery.temporalConstraints.length,
      text: originalText.toLowerCase().trim(),
    }
    return btoa(JSON.stringify(keyData))
  }

  /**
   * Check cache for existing result
   */
  private checkCache(cacheKey: string): QueryResult | null {
    const cached = this.queryCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result
    }
    return null
  }

  /**
   * Cache query result
   */
  private cacheResult(cacheKey: string, result: QueryResult): void {
    this.queryCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
    })

    // Clean old cache entries
    if (this.queryCache.size > 100) {
      const oldestKey = Array.from(this.queryCache.keys())[0]
      this.queryCache.delete(oldestKey)
    }
  }
}
