// Mock geographic data for testing and demonstration
import type { GeographicFeature, SatelliteImage } from "../types/geographic"

export const mockGeographicFeatures: GeographicFeature[] = [
  {
    id: "city-sf",
    name: "San Francisco",
    type: "point",
    coordinates: { latitude: 37.7749, longitude: -122.4194 },
    properties: {
      population: 873965,
      type: "city",
      state: "California",
      country: "USA",
      elevation: 52,
    },
    metadata: {
      source: "OpenStreetMap",
      timestamp: "2024-01-15",
      accuracy: 10,
    },
  },
  {
    id: "city-la",
    name: "Los Angeles",
    type: "point",
    coordinates: { latitude: 34.0522, longitude: -118.2437 },
    properties: {
      population: 3898747,
      type: "city",
      state: "California",
      country: "USA",
      elevation: 87,
    },
    metadata: {
      source: "OpenStreetMap",
      timestamp: "2024-01-15",
      accuracy: 10,
    },
  },
  {
    id: "park-yosemite",
    name: "Yosemite National Park",
    type: "polygon",
    coordinates: [
      [
        { latitude: 37.8651, longitude: -119.5383 },
        { latitude: 37.8651, longitude: -119.2058 },
        { latitude: 37.4956, longitude: -119.2058 },
        { latitude: 37.4956, longitude: -119.5383 },
        { latitude: 37.8651, longitude: -119.5383 },
      ],
    ],
    properties: {
      type: "national_park",
      area_km2: 3027,
      established: "1890",
      state: "California",
      country: "USA",
    },
    metadata: {
      source: "National Park Service",
      timestamp: "2024-01-15",
      accuracy: 100,
    },
  },
  {
    id: "mountain-whitney",
    name: "Mount Whitney",
    type: "point",
    coordinates: { latitude: 36.5786, longitude: -118.2923 },
    properties: {
      elevation: 4421,
      type: "mountain_peak",
      prominence: 3073,
      state: "California",
      country: "USA",
    },
    metadata: {
      source: "USGS",
      timestamp: "2024-01-15",
      accuracy: 5,
    },
  },
  {
    id: "river-colorado",
    name: "Colorado River",
    type: "linestring",
    coordinates: [
      { latitude: 40.4708, longitude: -105.8286 }, // Source
      { latitude: 39.0639, longitude: -108.5506 },
      { latitude: 37.1853, longitude: -109.602 },
      { latitude: 36.865, longitude: -111.39 },
      { latitude: 36.0544, longitude: -112.1401 },
      { latitude: 35.1983, longitude: -114.5794 },
      { latitude: 32.7157, longitude: -114.7244 }, // Mouth
    ],
    properties: {
      length_km: 2334,
      type: "river",
      drainage_basin_km2: 637137,
      countries: ["USA", "Mexico"],
    },
    metadata: {
      source: "USGS",
      timestamp: "2024-01-15",
      accuracy: 50,
    },
  },
]

export const mockSatelliteImages: SatelliteImage[] = [
  {
    id: "sat-sf-2024",
    url: "/san-francisco-bay-satellite.png",
    bounds: {
      north: 37.8324,
      south: 37.7074,
      east: -122.3482,
      west: -122.515,
    },
    resolution: 10, // 10 meters per pixel
    captureDate: "2024-01-15",
    bands: ["red", "green", "blue", "nir"],
    metadata: {
      satellite: "Landsat-8",
      cloud_cover: 5,
      quality: "high",
    },
  },
  {
    id: "sat-yosemite-2024",
    url: "/yosemite-satellite.png",
    bounds: {
      north: 37.8651,
      south: 37.4956,
      east: -119.2058,
      west: -119.5383,
    },
    resolution: 30,
    captureDate: "2024-01-10",
    bands: ["red", "green", "blue", "nir", "swir1", "swir2"],
    metadata: {
      satellite: "Sentinel-2",
      cloud_cover: 12,
      quality: "medium",
    },
  },
]

export { mockGeographicFeatures as mockGeographicData }
