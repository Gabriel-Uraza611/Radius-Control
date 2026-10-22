package com.radiuscontrol.alert

import jakarta.persistence.Entity
import jakarta.persistence.Table
import jakarta.persistence.Id
import jakarta.persistence.Column
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import java.time.OffsetDateTime
import java.util.UUID

@Entity
@Table(name = "incidents")
data class Incident(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    val id: UUID? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    val category: Category,

    @Column(columnDefinition = "TEXT")
    val description: String? = null,

    @Column(nullable = false)
    val lat: Double,

    @Column(nullable = false)
    val lng: Double,

    @Column(name = "report_count", nullable = false)
    val reportCount: Int = 1,

    @Column(name = "first_reported_at", nullable = false, columnDefinition = "timestamptz")
    val firstReportedAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "last_reported_at", nullable = false, columnDefinition = "timestamptz")
    val lastReportedAt: OffsetDateTime = OffsetDateTime.now()
) {
    fun withUpdatedReport(newLat: Double, newLng: Double, newDescription: String? = null): Incident {
        val totalReports = reportCount + 1
        val newLat = (lat * reportCount + newLat) / totalReports
        val newLng = (lng * reportCount + newLng) / totalReports
        return copy(
            lat = newLat,
            lng = newLng,
            reportCount = totalReports,
            lastReportedAt = OffsetDateTime.now(),
            description = newDescription ?: description
        )
    }
}