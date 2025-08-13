import { SpatialIndex } from "@/lib/spatial/spatial-index"
import { RAGEngine } from "@/lib/rag/rag-engine"
import { GeographicQueryEngine } from "@/lib/query/query-engine"
import { mockGeographicData } from "@/lib/data/mock-geographic-data"

export interface TestResult {
  testName: string
  passed: boolean
  duration: number
  details?: string
}

export class SystemValidator {
  private spatialIndex: SpatialIndex
  private ragEngine: RAGEngine
  private queryEngine: GeographicQueryEngine

  constructor() {
    this.spatialIndex = new SpatialIndex()
    this.ragEngine = new RAGEngine()
    this.queryEngine = new GeographicQueryEngine(this.spatialIndex, this.ragEngine)
    this.initializeTestData()
  }

  private initializeTestData() {
    // Initialize with mock data
    mockGeographicData.forEach((item) => {
      this.spatialIndex.insert(item)
      this.ragEngine.addDocument({
        id: item.id,
        content: `${item.name}: ${item.description}`,
        metadata: {
          type: item.type,
          coordinates: item.coordinates,
          properties: item.properties,
        },
      })
    })
  }

  async runAllTests(): Promise<TestResult[]> {
    const tests = [
      this.testSpatialIndexing.bind(this),
      this.testRAGRetrieval.bind(this),
      this.testQueryProcessing.bind(this),
      this.testPerformance.bind(this),
      this.testDataIntegrity.bind(this),
    ]

    const results: TestResult[] = []

    for (const test of tests) {
      try {
        const result = await test()
        results.push(result)
      } catch (error) {
        results.push({
          testName: test.name,
          passed: false,
          duration: 0,
          details: `Test failed with error: ${error}`,
        })
      }
    }

    return results
  }

  private async testSpatialIndexing(): Promise<TestResult> {
    const startTime = performance.now()

    // Test radius search
    const sanFrancisco = [-122.4194, 37.7749]
    const results = this.spatialIndex.searchRadius(sanFrancisco, 100000) // 100km

    const duration = performance.now() - startTime
    const passed = results.length > 0 && results.every((r) => r.coordinates)

    return {
      testName: "Spatial Indexing",
      passed,
      duration,
      details: `Found ${results.length} features within 100km of San Francisco`,
    }
  }

  private async testRAGRetrieval(): Promise<TestResult> {
    const startTime = performance.now()

    // Test semantic search
    const results = await this.ragEngine.search("national parks in California", {
      limit: 5,
      threshold: 0.1,
    })

    const duration = performance.now() - startTime
    const passed = results.length > 0 && results.every((r) => r.score >= 0)

    return {
      testName: "RAG Retrieval",
      passed,
      duration,
      details: `Retrieved ${results.length} relevant documents with average score ${
        results.reduce((sum, r) => sum + r.score, 0) / results.length
      }`,
    }
  }

  private async testQueryProcessing(): Promise<TestResult> {
    const startTime = performance.now()

    // Test natural language query
    const query = "Find national parks near San Francisco"
    const results = await this.queryEngine.processQuery(query)

    const duration = performance.now() - startTime
    const passed = results.results && results.results.length > 0

    return {
      testName: "Query Processing",
      passed,
      duration,
      details: `Processed query "${query}" and found ${results.results?.length || 0} results`,
    }
  }

  private async testPerformance(): Promise<TestResult> {
    const startTime = performance.now()

    // Run multiple queries to test performance
    const queries = [
      "mountains in California",
      "rivers near Los Angeles",
      "national parks with elevation above 1000m",
      "cities in the San Francisco Bay Area",
    ]

    const results = await Promise.all(queries.map((q) => this.queryEngine.processQuery(q)))

    const duration = performance.now() - startTime
    const averageTime = duration / queries.length
    const passed = averageTime < 200 // Should be under 200ms per query

    return {
      testName: "Performance Test",
      passed,
      duration,
      details: `Average query time: ${averageTime.toFixed(2)}ms for ${queries.length} queries`,
    }
  }

  private async testDataIntegrity(): Promise<TestResult> {
    const startTime = performance.now()

    // Verify all mock data is properly indexed
    const totalFeatures = mockGeographicData.length
    const indexedFeatures = this.spatialIndex.searchBounds({
      minLat: -90,
      maxLat: 90,
      minLng: -180,
      maxLng: 180,
    }).length

    const ragDocuments = await this.ragEngine.search("", { limit: 100, threshold: 0 })

    const duration = performance.now() - startTime
    const passed = indexedFeatures === totalFeatures && ragDocuments.length === totalFeatures

    return {
      testName: "Data Integrity",
      passed,
      duration,
      details: `Spatial: ${indexedFeatures}/${totalFeatures}, RAG: ${ragDocuments.length}/${totalFeatures}`,
    }
  }

  generateReport(results: TestResult[]): string {
    const passed = results.filter((r) => r.passed).length
    const total = results.length
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)

    let report = `\n=== Geographic Information RAG System Test Report ===\n\n`
    report += `Overall: ${passed}/${total} tests passed\n`
    report += `Total execution time: ${totalDuration.toFixed(2)}ms\n\n`

    results.forEach((result) => {
      const status = result.passed ? "✅ PASS" : "❌ FAIL"
      report += `${status} ${result.testName} (${result.duration.toFixed(2)}ms)\n`
      if (result.details) {
        report += `   ${result.details}\n`
      }
      report += `\n`
    })

    return report
  }
}

// Export test runner function
export async function runSystemTests(): Promise<string> {
  const validator = new SystemValidator()
  const results = await validator.runAllTests()
  return validator.generateReport(results)
}
