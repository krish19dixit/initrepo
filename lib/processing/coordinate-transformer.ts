// Coordinate system transformation utilities
import type { Coordinates } from "../types/geographic"

export interface ProjectionOptions {
  from: "WGS84" | "WebMercator" | "UTM"
  to: "WGS84" | "WebMercator" | "UTM"
  utmZone?: number
}

export class CoordinateTransformer {
  /**
   * Transform coordinates between different coordinate systems
   */
  static transform(coords: Coordinates, options: ProjectionOptions): Coordinates {
    if (options.from === options.to) {
      return { ...coords }
    }

    // Convert to WGS84 first if needed
    let wgs84Coords = coords
    if (options.from === "WebMercator") {
      wgs84Coords = this.webMercatorToWGS84(coords)
    } else if (options.from === "UTM") {
      wgs84Coords = this.utmToWGS84(coords, options.utmZone || this.getUTMZone(coords.longitude))
    }

    // Convert from WGS84 to target system
    if (options.to === "WebMercator") {
      return this.wgs84ToWebMercator(wgs84Coords)
    } else if (options.to === "UTM") {
      return this.wgs84ToUTM(wgs84Coords, options.utmZone || this.getUTMZone(wgs84Coords.longitude))
    }

    return wgs84Coords
  }

  /**
   * Convert WGS84 to Web Mercator (EPSG:3857)
   */
  private static wgs84ToWebMercator(coords: Coordinates): Coordinates {
    const x = (coords.longitude * 20037508.34) / 180
    let y = Math.log(Math.tan(((90 + coords.latitude) * Math.PI) / 360)) / (Math.PI / 180)
    y = (y * 20037508.34) / 180

    return {
      longitude: x,
      latitude: y,
    }
  }

  /**
   * Convert Web Mercator to WGS84
   */
  private static webMercatorToWGS84(coords: Coordinates): Coordinates {
    const longitude = (coords.longitude * 180) / 20037508.34
    let latitude = (coords.latitude * 180) / 20037508.34
    latitude = (180 / Math.PI) * (2 * Math.atan(Math.exp((latitude * Math.PI) / 180)) - Math.PI / 2)

    return { longitude, latitude }
  }

  /**
   * Convert WGS84 to UTM (simplified implementation)
   */
  private static wgs84ToUTM(coords: Coordinates, zone: number): Coordinates {
    const a = 6378137 // WGS84 semi-major axis
    const e = 0.0818191908 // WGS84 first eccentricity
    const k0 = 0.9996 // UTM scale factor

    const lat = (coords.latitude * Math.PI) / 180
    const lon = (coords.longitude * Math.PI) / 180
    const lonOrigin = (((zone - 1) * 6 - 180 + 3) * Math.PI) / 180

    const N = a / Math.sqrt(1 - e * e * Math.sin(lat) * Math.sin(lat))
    const T = Math.tan(lat) * Math.tan(lat)
    const C = ((e * e) / (1 - e * e)) * Math.cos(lat) * Math.cos(lat)
    const A = Math.cos(lat) * (lon - lonOrigin)

    const M =
      a *
      ((1 - (e * e) / 4 - (3 * e * e * e * e) / 64) * lat -
        ((3 * e * e) / 8 + (3 * e * e * e * e) / 32) * Math.sin(2 * lat) +
        ((15 * e * e * e * e) / 256) * Math.sin(4 * lat))

    const x =
      k0 *
        N *
        (A +
          ((1 - T + C) * A * A * A) / 6 +
          ((5 - 18 * T + T * T + 72 * C - 58 * ((e * e) / (1 - e * e))) * A * A * A * A * A) / 120) +
      500000

    const y =
      k0 *
      (M +
        N *
          Math.tan(lat) *
          ((A * A) / 2 +
            ((5 - T + 9 * C + 4 * C * C) * A * A * A * A) / 24 +
            ((61 - 58 * T + T * T + 600 * C - 330 * ((e * e) / (1 - e * e))) * A * A * A * A * A * A) / 720))

    return {
      longitude: x,
      latitude: coords.latitude >= 0 ? y : y + 10000000,
    }
  }

  /**
   * Convert UTM to WGS84 (simplified implementation)
   */
  private static utmToWGS84(coords: Coordinates, zone: number): Coordinates {
    // This is a simplified reverse transformation
    // In a real implementation, you'd use a proper geodetic library
    const lonOrigin = (zone - 1) * 6 - 180 + 3

    // Approximate conversion (not geodetically accurate)
    const x = coords.longitude - 500000
    const y = coords.latitude > 5000000 ? coords.latitude - 10000000 : coords.latitude

    const longitude = lonOrigin + x / 111320
    const latitude = y / 110540

    return { longitude, latitude }
  }

  /**
   * Get UTM zone from longitude
   */
  private static getUTMZone(longitude: number): number {
    return Math.floor((longitude + 180) / 6) + 1
  }

  /**
   * Calculate distance between coordinates accounting for coordinate system
   */
  static calculateDistance(
    coord1: Coordinates,
    coord2: Coordinates,
    system: "WGS84" | "WebMercator" | "UTM" = "WGS84",
  ): number {
    if (system === "WGS84") {
      // Use Haversine formula for WGS84
      const R = 6371 // Earth's radius in kilometers
      const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180
      const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((coord1.latitude * Math.PI) / 180) *
          Math.cos((coord2.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2)

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return R * c
    } else {
      // For projected coordinates, use Euclidean distance
      const dx = coord2.longitude - coord1.longitude
      const dy = coord2.latitude - coord1.latitude
      return Math.sqrt(dx * dx + dy * dy) / 1000 // Convert to km
    }
  }
}
