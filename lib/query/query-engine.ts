// Main query engine that orchestrates parsing and execution
import { GeographicQueryParser } from "./parser"
import { QueryExecutor } from "./executor"
import type { GeographicRAGEngine } from "../rag/rag-engine"
import type { QuadTreeSpatialIndex } from "../spatial/spatial-index"
import type { QueryResult } from "./types"

export interface QueryEngineOptions {
  enableCaching: boolean
  maxCacheSize: number
  defaultSpatialRadius: number
  confidenceThreshold: number
}

export class GeographicQueryEngine {
  private parser: typeof GeographicQueryParser
  private executor: QueryExecutor
  private options: QueryEngineOptions

  constructor(
    ragEngine: GeographicRAGEngine,
    spatialIndex: QuadTreeSpatialIndex,
    options: Partial<QueryEngineOptions> = {},
  ) {
    this.parser = GeographicQueryParser
    this.executor = new QueryExecutor(ragEngine, spatialIndex)
    this.options = {
      enableCaching: true,
      maxCacheSize: 100,
      defaultSpatialRadius: 50,
      confidenceThreshold: 0.5,
      ...options,
    }
  }

  /**
   * Process a natural language query
   */
  async processQuery(queryText: string): Promise<QueryResult> {
    try {
      // Parse the query
      const parsedQuery = this.parser.parseQuery(queryText)

      // Check if parsing confidence is above threshold
      if (parsedQuery.confidence < this.options.confidenceThreshold) {
        return {
          success: false,
          data: null,
          metadata: {
            executionTime: 0,
            stepsExecuted: 0,
            cacheHit: false,
            confidence: parsedQuery.confidence,
          },
          error: `Query parsing confidence (${parsedQuery.confidence.toFixed(2)}) is below threshold. Please rephrase your query.`,
        }
      }

      // Execute the query
      const result = await this.executor.executeQuery(parsedQuery, queryText)

      return result
    } catch (error) {
      return {
        success: false,
        data: null,
        metadata: {
          executionTime: 0,
          stepsExecuted: 0,
          cacheHit: false,
          confidence: 0,
        },
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  }

  /**
   * Get query suggestions based on partial input
   */
  getSuggestions(partialQuery: string): string[] {
    const suggestions: string[] = []

    // Common geographic query patterns
    const patterns = [
      "Find cities near {location}",
      "What is the vegetation in {location}?",
      "Show satellite analysis of {location}",
      "Compare {location1} and {location2}",
      "Find water bodies within {distance} of {location}",
      "Analyze land use changes in {location}",
      "What are the geographic features of {location}?",
      "Find mountains higher than {elevation} meters",
      "Show urban areas in {region}",
      "What is the climate like in {location}?",
    ]

    // Filter patterns based on partial input
    const lowerPartial = partialQuery.toLowerCase()
    patterns.forEach((pattern) => {
      if (pattern.toLowerCase().includes(lowerPartial) || lowerPartial.length < 3) {
        suggestions.push(pattern)
      }
    })

    return suggestions.slice(0, 5) // Return top 5 suggestions
  }

  /**
   * Validate query before processing
   */
  validateQuery(queryText: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = []

    if (!queryText || queryText.trim().length === 0) {
      issues.push("Query cannot be empty")
    }

    if (queryText.length > 500) {
      issues.push("Query is too long (max 500 characters)")
    }

    if (queryText.length < 3) {
      issues.push("Query is too short (min 3 characters)")
    }

    // Check for potentially problematic patterns
    if (!/[a-zA-Z]/.test(queryText)) {
      issues.push("Query must contain at least some text")
    }

    return {
      isValid: issues.length === 0,
      issues,
    }
  }

  /**
   * Get engine statistics
   */
  getStats(): {
    parsingEnabled: boolean
    executionEnabled: boolean
    cacheEnabled: boolean
    confidenceThreshold: number
  } {
    return {
      parsingEnabled: true,
      executionEnabled: true,
      cacheEnabled: this.options.enableCaching,
      confidenceThreshold: this.options.confidenceThreshold,
    }
  }
}
