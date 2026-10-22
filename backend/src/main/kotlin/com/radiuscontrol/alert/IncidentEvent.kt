package com.radiuscontrol.alert

import org.springframework.context.ApplicationEvent

enum class IncidentEventType {
    CREATED,
    UPDATED
}

data class IncidentEvent(
    val type: IncidentEventType,
    val incident: Incident
) : ApplicationEvent(incident)