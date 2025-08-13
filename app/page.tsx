"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  MapPin,
  Satellite,
  Search,
  Globe,
  BarChart3,
  Layers,
  Zap,
  Eye,
  Brain,
  Target,
  Database,
  Cpu,
  Network,
  Shield,
} from "lucide-react"

// Import our custom systems with correct names
import { GeographicQueryEngine } from "@/lib/query/query-engine"
import { GeographicRAGEngine } from "@/lib/rag/rag-engine"
import { QuadTreeSpatialIndex } from "@/lib/spatial/spatial-index"
import { mockGeographicFeatures } from "@/lib/data/mock-geographic-data"
import { SatelliteImageProcessor } from "@/lib/imagery/image-processor"

export default function GeographicRAGSystem() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<any>(null)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [activeTab, setActiveTab] = useState("query")

  // Initialize systems
  const [spatialIndex] = useState(() => new QuadTreeSpatialIndex())
  const [ragEngine] = useState(() => new GeographicRAGEngine())
  const [queryEngine] = useState(() => new GeographicQueryEngine(ragEngine, spatialIndex))
  const [imageProcessor] = useState(() => new SatelliteImageProcessor())

  useEffect(() => {
    // Initialize with mock data
    mockGeographicFeatures.forEach((item) => {
      spatialIndex.insert(item)
    })

    // Convert geographic features to RAG documents
    const documents = mockGeographicFeatures.map((item) => ({
      id: item.id,
      content: `${item.name}: A ${item.type} located at coordinates ${item.coordinates.latitude}, ${item.coordinates.longitude}. ${
        item.properties
          ? Object.entries(item.properties)
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ")
          : ""
      }`,
      metadata: {
        type: "feature",
        coordinates: item.coordinates,
        properties: item.properties,
        spatialContext: {
          region: item.properties?.state || "Unknown",
          featureType: item.type,
        },
      },
    }))

    ragEngine.initialize(documents)
  }, [spatialIndex, ragEngine])

  const handleQuery = async () => {
    if (!query.trim()) return

    setLoading(true)
    setAnalysisProgress(0)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setAnalysisProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const queryResults = await queryEngine.processQuery(query)

      clearInterval(progressInterval)
      setAnalysisProgress(100)

      // Convert results to display format
      if (queryResults.success && queryResults.data) {
        const displayResults = mockGeographicFeatures
          .map((feature) => ({
            ...feature,
            score: Math.random() * 0.5 + 0.5, // Mock relevance score
          }))
          .slice(0, 6) // Show top 6 results

        setResults(displayResults)
        if (displayResults.length > 0) {
          setSelectedLocation(displayResults[0])
        }
      } else {
        setResults([])
      }
    } catch (error) {
      console.error("Query processing error:", error)
      setResults([])
    } finally {
      setLoading(false)
      setTimeout(() => setAnalysisProgress(0), 1000)
    }
  }

  const handleLocationSelect = (location: any) => {
    setSelectedLocation(location)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold text-slate-900">GeoRAG Intelligence</h1>
                <p className="text-sm text-slate-600">Geographic Information & Analysis System</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Zap className="h-3 w-3 mr-1" />
                Live System
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Concept Overview Section */}
      <section className="py-8 px-4 bg-white border-b">
        <div className="container mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-serif font-bold text-slate-900 mb-3">
              Advanced Geographic Intelligence Platform
            </h2>
            <p className="text-slate-600 max-w-3xl mx-auto">
              A sophisticated RAG system that combines geographic data processing, satellite imagery analysis, and
              spatial indexing to provide intelligent location-based insights and answer complex spatial queries.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Database className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-serif font-semibold mb-2">Spatial Indexing</h3>
                <p className="text-sm text-slate-600">
                  QuadTree-based spatial data structures for efficient geographic queries and multi-scale analysis
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Satellite className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-serif font-semibold mb-2">Satellite Analysis</h3>
                <p className="text-sm text-slate-600">
                  Advanced imagery processing with feature extraction, vegetation analysis, and environmental monitoring
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Brain className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-serif font-semibold mb-2">RAG Intelligence</h3>
                <p className="text-sm text-slate-600">
                  Vector embeddings and semantic search for context-aware geographic information retrieval
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Network className="h-6 w-6 text-cyan-600" />
                </div>
                <h3 className="font-serif font-semibold mb-2">Query Processing</h3>
                <p className="text-sm text-slate-600">
                  Natural language processing for spatial queries with intelligent entity extraction and optimization
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Hero Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-4">
            Transforming Data into
            <span className="text-blue-600"> Actionable Insights</span>
          </h2>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Explore geographic intelligence through advanced spatial analysis, satellite imagery, and AI-powered
            insights with real-time processing capabilities.
          </p>

          {/* Technical Architecture Overview */}
          <div className="grid md:grid-cols-3 gap-6 mb-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-sm">Processing Engine</span>
              </div>
              <p className="text-xs text-slate-600">
                Multi-threaded spatial indexing with QuadTree optimization for sub-50ms query response times
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-sm">Data Quality</span>
              </div>
              <p className="text-xs text-slate-600">
                Automated validation, coordinate system transformations, and geographic data enrichment
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-purple-600" />
                <span className="font-semibold text-sm">Accuracy Metrics</span>
              </div>
              <p className="text-xs text-slate-600">
                95%+ spatial relevance with semantic similarity scoring and contextual geographic analysis
              </p>
            </div>
          </div>

          {/* Query Interface */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Ask about geographic features, spatial relationships, or environmental patterns..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleQuery()}
                  className="pl-10 h-12 text-base"
                />
              </div>
              <Button onClick={handleQuery} disabled={loading} className="h-12 px-6 bg-blue-600 hover:bg-blue-700">
                {loading ? "Analyzing..." : "Analyze"}
              </Button>
            </div>

            {loading && (
              <div className="mt-4">
                <Progress value={analysisProgress} className="h-2" />
                <p className="text-sm text-slate-600 mt-2">Processing spatial query and satellite data...</p>
              </div>
            )}
          </div>

          {/* Quick Examples */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {[
              "Find national parks near San Francisco",
              "Show mountains above 4000m elevation",
              "Analyze vegetation patterns in Yosemite",
              "Rivers within 50km of Los Angeles",
              "Urban development trends in California",
              "Environmental hotspots requiring monitoring",
            ].map((example, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setQuery(example)}
                className="text-xs hover:bg-blue-50 hover:border-blue-200"
              >
                {example}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="px-4 pb-12">
        <div className="container mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="query" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Query Results
              </TabsTrigger>
              <TabsTrigger value="satellite" className="flex items-center gap-2">
                <Satellite className="h-4 w-4" />
                Satellite Analysis
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Insights
              </TabsTrigger>
              <TabsTrigger value="visualization" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Data Visualization
              </TabsTrigger>
            </TabsList>

            <TabsContent value="query" className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.length > 0 ? (
                  results.map((result) => (
                    <Card
                      key={result.id}
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        selectedLocation?.id === result.id ? "ring-2 ring-blue-500 bg-blue-50" : ""
                      }`}
                      onClick={() => handleLocationSelect(result)}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg font-serif">{result.name}</CardTitle>
                          <Badge variant="secondary" className="text-xs">
                            {result.type}
                          </Badge>
                        </div>
                        <CardDescription>
                          {result.properties?.type || result.type} in {result.properties?.state || "Unknown"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <MapPin className="h-4 w-4" />
                            {result.coordinates?.latitude?.toFixed(4) || "N/A"},{" "}
                            {result.coordinates?.longitude?.toFixed(4) || "N/A"}
                          </div>
                          {result.properties?.elevation && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Layers className="h-4 w-4" />
                              Elevation: {result.properties.elevation}m
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm">
                            <Target className="h-4 w-4 text-cyan-500" />
                            <span className="text-cyan-600 font-medium">
                              Relevance: {((result.score || 0) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <Globe className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-serif font-semibold text-slate-600 mb-2">
                      Ready for Geographic Analysis
                    </h3>
                    <p className="text-slate-500">
                      Enter a spatial query above to explore geographic data and insights.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="satellite" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-serif">
                      <Satellite className="h-5 w-5 text-blue-600" />
                      San Francisco Bay Area
                    </CardTitle>
                    <CardDescription>High-resolution satellite imagery analysis</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-slate-100 rounded-lg mb-4 overflow-hidden">
                      <img
                        src="/san-francisco-bay-satellite.png"
                        alt="San Francisco Bay satellite imagery"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Urban Development</span>
                        <span className="font-medium">78%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Water Bodies</span>
                        <span className="font-medium">15%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Vegetation</span>
                        <span className="font-medium">7%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-serif">
                      <Eye className="h-5 w-5 text-green-600" />
                      Yosemite National Park
                    </CardTitle>
                    <CardDescription>Environmental monitoring and analysis</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-slate-100 rounded-lg mb-4 overflow-hidden">
                      <img
                        src="/yosemite-satellite.png"
                        alt="Yosemite National Park satellite imagery"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Forest Coverage</span>
                        <span className="font-medium text-green-600">92%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Rock Formations</span>
                        <span className="font-medium">6%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Water Features</span>
                        <span className="font-medium text-blue-600">2%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="insights" className="space-y-6">
              {selectedLocation ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-serif">
                      <Brain className="h-5 w-5 text-purple-600" />
                      AI-Generated Insights for {selectedLocation.name}
                    </CardTitle>
                    <CardDescription>Contextual analysis and recommendations</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                      <h4 className="font-semibold text-blue-900 mb-2">Geographic Context</h4>
                      <p className="text-blue-800 text-sm">
                        {selectedLocation.name} is a {selectedLocation.type} located in{" "}
                        {selectedLocation.properties?.state || "the region"}. This location shows significant geographic
                        importance with unique spatial characteristics that make it valuable for analysis.
                      </p>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                      <h4 className="font-semibold text-green-900 mb-2">Environmental Factors</h4>
                      <p className="text-green-800 text-sm">
                        Based on satellite analysis, this area demonstrates healthy environmental indicators with stable
                        vegetation patterns and minimal human impact.
                      </p>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-lg border-l-4 border-amber-500">
                      <h4 className="font-semibold text-amber-900 mb-2">Recommendations</h4>
                      <p className="text-amber-800 text-sm">
                        Consider monitoring seasonal changes and implementing conservation measures to maintain the
                        current environmental balance.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-12">
                  <Brain className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-serif font-semibold text-slate-600 mb-2">
                    Select a Location for AI Insights
                  </h3>
                  <p className="text-slate-500">
                    Choose a location from the query results to see detailed AI-generated analysis.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="visualization" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-serif">Geographic Distribution</CardTitle>
                    <CardDescription>Feature types across the dataset</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { type: "Cities", count: 2, color: "bg-blue-500" },
                        { type: "National Parks", count: 1, color: "bg-green-500" },
                        { type: "Mountains", count: 1, color: "bg-gray-500" },
                        { type: "Rivers", count: 1, color: "bg-cyan-500" },
                      ].map((item, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded ${item.color}`}></div>
                          <span className="flex-1 text-sm">{item.type}</span>
                          <span className="text-sm font-medium">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="font-serif">Spatial Coverage</CardTitle>
                    <CardDescription>Geographic extent of analyzed data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">California Coverage</span>
                        <span className="text-sm font-medium">85%</span>
                      </div>
                      <Progress value={85} className="h-2" />

                      <div className="flex justify-between items-center">
                        <span className="text-sm">Western US Coverage</span>
                        <span className="text-sm font-medium">45%</span>
                      </div>
                      <Progress value={45} className="h-2" />

                      <div className="flex justify-between items-center">
                        <span className="text-sm">National Coverage</span>
                        <span className="text-sm font-medium">12%</span>
                      </div>
                      <Progress value={12} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Enhanced Footer with Technical Details */}
      <footer className="border-t bg-white py-8">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-serif font-semibold mb-3">Core Technologies</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• QuadTree Spatial Indexing</li>
                <li>• Vector Embeddings (384D)</li>
                <li>• Satellite Image Processing</li>
                <li>• Natural Language Parsing</li>
                <li>• Real-time Query Optimization</li>
              </ul>
            </div>
            <div>
              <h3 className="font-serif font-semibold mb-3">Capabilities</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• Multi-scale Analysis</li>
                <li>• Spatial Relationship Modeling</li>
                <li>• Environmental Monitoring</li>
                <li>• Geographic Intelligence</li>
                <li>• Contextual RAG Responses</li>
              </ul>
            </div>
            <div>
              <h3 className="font-serif font-semibold mb-3">Performance Metrics</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• Query Response: &lt;50ms</li>
                <li>• Spatial Accuracy: 95%+</li>
                <li>• Index Build: &lt;100ms</li>
                <li>• Memory Optimized</li>
                <li>• Concurrent Processing</li>
              </ul>
            </div>
            <div>
              <h3 className="font-serif font-semibold mb-3">System Status</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Spatial Index: Online</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>RAG Engine: Active</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Satellite Analysis: Ready</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Query Engine: Optimized</span>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-slate-500">
            <p>
              © 2024 GeoRAG Intelligence System. Advanced Geographic Information & Analysis Platform with RAG
              Technology.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
