// Geographic data parsing and format conversion utilities
import type { GeographicFeature, Coordinates } from "../types/geographic"

export interface GeoJSONFeature {
  type: "Feature"
  geometry: {
    type: "Point" | "LineString" | "Polygon"
    coordinates: number[] | number[][] | number[][][]
  }
  properties: Record<string, any>
  id?: string | number
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection"
  features: GeoJSONFeature[]
}

export class GeographicDataParser {
  /**
   * Parse GeoJSON data into internal geographic features
   */
  static parseGeoJSON(data: GeoJSONFeatureCollection | GeoJSONFeature): GeographicFeature[] {
    const features: GeoJSONFeature[] = data.type === "FeatureCollection" ? data.features : [data]

    return features.map((feature, index) => {
      const id = feature.id?.toString() || `feature-${index}`
      const name = feature.properties?.name || feature.properties?.title || `Feature ${index + 1}`

      let coordinates: Coordinates | Coordinates[] | Coordinates[][]
      let type: "point" | "polygon" | "linestring"

      switch (feature.geometry.type) {
        case "Point":
          const pointCoords = feature.geometry.coordinates as number[]
          coordinates = { longitude: pointCoords[0], latitude: pointCoords[1] }
          type = "point"
          break

        case "LineString":
          const lineCoords = feature.geometry.coordinates as number[][]
          coordinates = lineCoords.map((coord) => ({
            longitude: coord[0],
            latitude: coord[1],
          }))
          type = "linestring"
          break

        case "Polygon":
          const polygonCoords = feature.geometry.coordinates as number[][][]
          coordinates = polygonCoords.map((ring) =>
            ring.map((coord) => ({
              longitude: coord[0],
              latitude: coord[1],
            })),
          )
          type = "polygon"
          break

        default:
          throw new Error(`Unsupported geometry type: ${feature.geometry.type}`)
      }

      return {
        id,
        name,
        type,
        coordinates,
        properties: feature.properties || {},
        metadata: {
          source: "GeoJSON",
          timestamp: new Date().toISOString(),
        },
      }
    })
  }

  /**
   * Parse CSV data with latitude/longitude columns
   */
  static parseCSV(
    csvText: string,
    options: {
      latColumn: string
      lonColumn: string
      nameColumn?: string
      idColumn?: string
      delimiter?: string
    },
  ): GeographicFeature[] {
    const { latColumn, lonColumn, nameColumn, idColumn, delimiter = "," } = options
    const lines = csvText.trim().split("\n")
    const headers = lines[0].split(delimiter).map((h) => h.trim())

    const latIndex = headers.indexOf(latColumn)
    const lonIndex = headers.indexOf(lonColumn)
    const nameIndex = nameColumn ? headers.indexOf(nameColumn) : -1
    const idIndex = idColumn ? headers.indexOf(idColumn) : -1

    if (latIndex === -1 || lonIndex === -1) {
      throw new Error(`Required columns not found: ${latColumn}, ${lonColumn}`)
    }

    return lines.slice(1).map((line, index) => {
      const values = line.split(delimiter).map((v) => v.trim())
      const latitude = Number.parseFloat(values[latIndex])
      const longitude = Number.parseFloat(values[lonIndex])

      if (isNaN(latitude) || isNaN(longitude)) {
        throw new Error(`Invalid coordinates at row ${index + 2}`)
      }

      const properties: Record<string, any> = {}
      headers.forEach((header, i) => {
        if (i !== latIndex && i !== lonIndex) {
          properties[header] = values[i]
        }
      })

      return {
        id: idIndex >= 0 ? values[idIndex] : `csv-feature-${index}`,
        name: nameIndex >= 0 ? values[nameIndex] : `Feature ${index + 1}`,
        type: "point" as const,
        coordinates: { latitude, longitude },
        properties,
        metadata: {
          source: "CSV",
          timestamp: new Date().toISOString(),
        },
      }
    })
  }

  /**
   * Convert internal features back to GeoJSON format
   */
  static toGeoJSON(features: GeographicFeature[]): GeoJSONFeatureCollection {
    return {
      type: "FeatureCollection",
      features: features.map((feature) => {
        let geometry: GeoJSONFeature["geometry"]

        switch (feature.type) {
          case "point":
            const pointCoords = feature.coordinates as Coordinates
            geometry = {
              type: "Point",
              coordinates: [pointCoords.longitude, pointCoords.latitude],
            }
            break

          case "linestring":
            const lineCoords = feature.coordinates as Coordinates[]
            geometry = {
              type: "LineString",
              coordinates: lineCoords.map((coord) => [coord.longitude, coord.latitude]),
            }
            break

          case "polygon":
            const polygonCoords = feature.coordinates as Coordinates[][]
            geometry = {
              type: "Polygon",
              coordinates: polygonCoords.map((ring) => ring.map((coord) => [coord.longitude, coord.latitude])),
            }
            break
        }

        return {
          type: "Feature",
          id: feature.id,
          geometry,
          properties: {
            name: feature.name,
            ...feature.properties,
          },
        }
      }),
    }
  }
}
