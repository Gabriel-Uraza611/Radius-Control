package com.radiuscontrol.alert

import com.radiuscontrol.user.UserService
import org.springframework.context.ApplicationEventPublisher
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.OffsetDateTime
import java.util.UUID

@Service
@Transactional
class AlertService(
    private val incidentMatcher: IncidentMatcher,
    private val incidentRepository: IncidentRepository,
    private val alertRepository: AlertRepository,
    private val userService: UserService,
    private val eventPublisher: ApplicationEventPublisher
) {

    data class CreateAlertResult(
        val incident: Incident,
        val merged: Boolean
    )

    fun createAlert(
        userId: UUID,
        category: Category,
        description: String?,
        lat: Double,
        lng: Double
    ): CreateAlertResult {
        // Validate user exists
        val user = userService.findById(userId)
            ?: throw IllegalArgumentException("Usuario no encontrado")

        // Check for duplicate incident
        val existingIncident = incidentMatcher.findMatch(category, lat, lng, description)

        val incident: Incident
        val merged: Boolean

        if (existingIncident != null) {
            // Check if user already reported this incident
            if (alertRepository.existsByUserIdAndIncidentId(userId, existingIncident.id!!)) {
                throw IllegalArgumentException("Ya reportaste este incidente")
            }

            // Update existing incident
            incident = existingIncident.withUpdatedReport(lat, lng, description)
            incidentRepository.save(incident)
            merged = true
        } else {
            // Create new incident
            incident = Incident(
                category = category,
                description = description,
                lat = lat,
                lng = lng
            )
            incidentRepository.save(incident)
            merged = false
        }

        // Create alert record linking user to incident
        val alert = Alert(
            userId = userId,
            incidentId = incident.id!!,
            category = category,
            description = description,
            lat = lat,
            lng = lng
        )
        alertRepository.save(alert)

        // Publish event for real-time broadcast
        val eventType = if (merged) IncidentEventType.UPDATED else IncidentEventType.CREATED
        eventPublisher.publishEvent(IncidentEvent(eventType, incident))

        return CreateAlertResult(incident, merged)
    }

    fun getActiveIncidents(): List<Incident> {
        val since = OffsetDateTime.now().minusHours(24)
        return incidentRepository.findActiveSince(since).toList()
    }
}