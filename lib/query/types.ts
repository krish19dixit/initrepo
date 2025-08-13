// Query engine types and interfaces
import type { Coordinates, BoundingBox } from "../types/geographic"

export interface ParsedQuery {
  intent: QueryIntent
  entities: ExtractedEntity[]
  spatialConstraints: SpatialConstraint[]
  temporalConstraints: TemporalConstraint[]
  filters: QueryFilter[]
  confidence: number
}

export interface QueryIntent {
  type: "search" | "compare" | "analyze" | "describe" | "find_nearby" | "route" | "change_detection"
  subtype?: string
  description: string
}

export interface ExtractedEntity {
  text: string
  type: "location" | "feature_type" | "measurement" | "time" | "organization"
  value: any
  confidence: number
  position: { start: number; end: number }
}

export interface SpatialConstraint {
  type: "point" | "radius" | "bounds" | "polygon" | "within" | "intersects" | "near"
  geometry: Coordinates | BoundingBox | Coordinates[]
  parameters?: {
    radius?: number
    unit?: "km" | "miles" | "meters"
    buffer?: number
  }
}

export interface TemporalConstraint {
  type: "before" | "after" | "between" | "during" | "recent"
  startDate?: string
  endDate?: string
  period?: string
}

export interface QueryFilter {
  field: string
  operator: "equals" | "contains" | "greater_than" | "less_than" | "in" | "not_in"
  value: any
}

export interface QueryExecutionPlan {
  steps: ExecutionStep[]
  estimatedCost: number
  cacheKey?: string
}

export interface ExecutionStep {
  id: string
  type: "spatial_filter" | "rag_search" | "analysis" | "aggregation" | "join"
  operation: string
  parameters: Record<string, any>
  dependencies: string[]
}

export interface QueryResult {
  success: boolean
  data: any
  metadata: {
    executionTime: number
    stepsExecuted: number
    cacheHit: boolean
    confidence: number
  }
  error?: string
}

export type { Coordinates } from "../types/geographic"
