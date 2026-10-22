package com.radiuscontrol.alert

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.OffsetDateTime
import java.util.List
import java.util.UUID

interface IncidentRepository : JpaRepository<Incident, UUID> {

    /**
     * Finds candidate incidents for duplicate detection.
     * Filters by: same category, within time window, within bounding box.
     * Exact distance check is done in application code using Haversine.
     */
    @Query("""
        SELECT i FROM Incident i
        WHERE i.category = :category
        AND i.lastReportedAt >= :since
        AND i.lat BETWEEN :minLat AND :maxLat
        AND i.lng BETWEEN :minLng AND :maxLng
        ORDER BY i.lastReportedAt DESC
    """)
    fun findCandidates(
        @Param("category") category: Category,
        @Param("since") since: OffsetDateTime,
        @Param("minLat") minLat: Double,
        @Param("maxLat") maxLat: Double,
        @Param("minLng") minLng: Double,
        @Param("maxLng") maxLng: Double
    ): List<Incident>

    /**
     * Returns active incidents from the last 24 hours.
     */
    @Query("SELECT i FROM Incident i WHERE i.lastReportedAt >= :since ORDER BY i.lastReportedAt DESC")
    fun findActiveSince(@Param("since") since: OffsetDateTime): List<Incident>
}