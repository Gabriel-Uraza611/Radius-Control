package com.radiuscontrol.realtime

import com.radiuscontrol.alert.Incident
import com.radiuscontrol.alert.IncidentEvent
import com.radiuscontrol.alert.IncidentEventType
import org.springframework.context.event.EventListener
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Component
import org.springframework.transaction.event.TransactionalEventListener
import org.springframework.transaction.event.TransactionPhase

@Component
class IncidentBroadcaster(private val messagingTemplate: SimpMessagingTemplate) {

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    fun handleIncidentEvent(event: IncidentEvent) {
        val incident = event.incident
        val dto = mapToDto(incident, event.type)
        messagingTemplate.convertAndSend("/topic/incidents", dto)
    }

    private fun mapToDto(incident: Incident, type: IncidentEventType): Map<String, Any> {
        return mapOf(
            "type" to type.name,
            "incident" to mapOf(
                "id" to incident.id.toString(),
                "category" to incident.category.name,
                "description" to incident.description,
                "lat" to incident.lat,
                "lng" to incident.lng,
                "reportCount" to incident.reportCount,
                "lastReportedAt" to incident.lastReportedAt.toString()
            )
        )
    }
}