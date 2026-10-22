package com.radiuscontrol.alert

import jakarta.validation.constraints.DecimalMax
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size

data class CreateAlertRequest(
    @NotNull
    val category: Category,

    @Size(max = 280)
    val description: String? = null,

    @NotNull @DecimalMin("-90.0") @DecimalMax("90.0")
    val lat: Double,

    @NotNull @DecimalMin("-180.0") @DecimalMax("180.0")
    val lng: Double
)

data class IncidentDto(
    val id: String,
    val category: Category,
    val description: String?,
    val lat: Double,
    val lng: Double,
    val reportCount: Int,
    val firstReportedAt: String,
    val lastReportedAt: String
) {
    companion object {
        fun from(incident: Incident): IncidentDto {
            return IncidentDto(
                id = incident.id.toString(),
                category = incident.category,
                description = incident.description,
                lat = incident.lat,
                lng = incident.lng,
                reportCount = incident.reportCount,
                firstReportedAt = incident.firstReportedAt.toString(),
                lastReportedAt = incident.lastReportedAt.toString()
            )
        }
    }
}

data class CreateAlertResponse(
    val incident: IncidentDto,
    val merged: Boolean
)