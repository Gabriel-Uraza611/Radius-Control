package com.radiuscontrol.shared.geo

import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt
import java.lang.Math.toRadians

/**
 * Geospatial utilities for incident matching.
 * Uses Haversine formula for accurate distance calculation on Earth's surface.
 */
object GeoUtils {

    private const val EARTH_RADIUS_METERS = 6371000.0

    /**
     * Calculates the distance between two points using the Haversine formula.
     * @param lat1 Latitude of point 1 in degrees
     * @param lng1 Longitude of point 1 in degrees
     * @param lat2 Latitude of point 2 in degrees
     * @param lng2 Longitude of point 2 in degrees
     * @return Distance in meters
     */
    fun haversineDistance(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
        val lat1Rad = toRadians(lat1)
        val lng1Rad = toRadians(lng1)
        val lat2Rad = toRadians(lat2)
        val lng2Rad = toRadians(lng2)

        val dLat = lat2Rad - lat1Rad
        val dLng = lng2Rad - lng1Rad

        val sinDLat2 = sin(dLat / 2.0)
        val sinDLng2 = sin(dLng / 2.0)
        val cosLat1 = cos(lat1Rad)
        val cosLat2 = cos(lat2Rad)

        val a = sinDLat2 * sinDLat2 + cosLat1 * cosLat2 * sinDLng2 * sinDLng2
        val c = 2.0 * atan2(sqrt(a), sqrt(1.0 - a))

        return EARTH_RADIUS_METERS * c
    }

    /**
     * Calculates a bounding box around a center point for efficient database pre-filtering.
     * @param lat Center latitude in degrees
     * @param lng Center longitude in degrees
     * @param radiusMeters Radius in meters
     * @return BoundingBox with min/max lat/lng
     */
    fun boundingBox(lat: Double, lng: Double, radiusMeters: Double): BoundingBox {
        // Approximate degrees per meter at equator
        val latDelta = radiusMeters / 111320.0
        // Longitude degrees per meter varies with latitude
        val lngDelta = radiusMeters / (111320.0 * cos(toRadians(lat)))

        return BoundingBox(
            minLat = lat - latDelta,
            maxLat = lat + latDelta,
            minLng = lng - lngDelta,
            maxLng = lng + lngDelta
        )
    }

    data class BoundingBox(
        val minLat: Double,
        val maxLat: Double,
        val minLng: Double,
        val maxLng: Double
    )
}