package com.radiuscontrol.alert

import com.radiuscontrol.shared.geo.GeoUtils
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.time.OffsetDateTime

@Component
class IncidentMatcher(
    private val incidentRepository: IncidentRepository,
    @Value("\${app.incident.radius-meters:150}") private val radiusMeters: Double,
    @Value("\${app.incident.window-minutes:30}") private val windowMinutes: Int
) {

    /**
     * Finds an existing incident that matches the new alert, or returns null if none.
     * Matching criteria:
     * - Same category
     * - Within time window (last_reported_at >= now - windowMinutes)
     * - Within radius (Haversine distance <= radiusMeters)
     * Returns the closest match if multiple candidates exist.
     */
    fun findMatch(
        category: Category,
        lat: Double,
        lng: Double,
        description: String? = null
    ): Incident? {
        val since = OffsetDateTime.now().minusMinutes(windowMinutes.toLong())
        val box = GeoUtils.boundingBox(lat, lng, radiusMeters)

        val candidates = incidentRepository.findCandidates(
            category = category,
            since = since,
            minLat = box.minLat,
            maxLat = box.maxLat,
            minLng = box.minLng,
            maxLng = box.maxLng
        )

        var bestMatch: Incident? = null
        var bestDistance = Double.MAX_VALUE

        for (candidate in candidates) {
            val distance = GeoUtils.haversineDistance(lat, lng, candidate.lat, candidate.lng)
            if (distance <= radiusMeters && distance < bestDistance) {
                bestDistance = distance
                bestMatch = candidate
            }
        }

        return bestMatch
    }
}