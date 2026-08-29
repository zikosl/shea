import axios from 'axios'
import { GraphQLError } from 'graphql'

export interface RouteCoordinate {
  latitude: number
  longitude: number
}

export interface DriverRouteResult {
  encodedPolyline: string
  distanceMeters: number
  durationSeconds: number
}

interface OsrmRouteResponse {
  code?: string
  message?: string
  routes?: Array<{ distance?: number; duration?: number; geometry?: string }>
}

export function isValidRouteCoordinate(
  coordinate: RouteCoordinate,
): boolean {
  return (
    Number.isFinite(coordinate.latitude) &&
    Number.isFinite(coordinate.longitude) &&
    Math.abs(coordinate.latitude) <= 90 &&
    Math.abs(coordinate.longitude) <= 180 &&
    !(coordinate.latitude === 0 && coordinate.longitude === 0)
  )
}

export async function computeDrivingRoute(
  origin: RouteCoordinate,
  destination: RouteCoordinate,
): Promise<DriverRouteResult> {
  const baseUrl = (process.env.OSRM_BASE_URL || 'https://router.project-osrm.org')
    .replace(/\/$/, '')
  const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`

  try {
    const response = await axios.get<OsrmRouteResponse>(
      `${baseUrl}/route/v1/driving/${coordinates}`,
      {
        timeout: 10_000,
        params: {
          alternatives: false,
          overview: 'full',
          geometries: 'polyline',
          steps: false,
        },
      },
    )

    const route = response.data.routes?.[0]
    const encodedPolyline = route?.geometry

    if (response.data.code !== 'Ok' || !route || !encodedPolyline) {
      throw new Error(response.data.message || 'No drivable route was returned')
    }

    return {
      encodedPolyline,
      distanceMeters: Math.round(route.distance ?? 0),
      durationSeconds: Math.ceil(route.duration ?? 0),
    }
  } catch (error) {
    if (error instanceof GraphQLError) throw error

    const reason = axios.isAxiosError<OsrmRouteResponse>(error)
      ? error.response?.data?.message
      : error instanceof Error
        ? error.message
        : undefined

    throw new GraphQLError(reason || 'Unable to calculate the driving route', {
      extensions: { code: 'ROUTE_SERVICE_UNAVAILABLE' },
    })
  }
}
