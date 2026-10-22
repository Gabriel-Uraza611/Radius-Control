package com.radiuscontrol.alert

import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/alerts")
class AlertController(private val alertService: AlertService) {

    @PostMapping
    fun createAlert(
        @Valid @RequestBody request: CreateAlertRequest
    ): ResponseEntity<CreateAlertResponse> {
        val authentication = SecurityContextHolder.getContext().authentication
        val userId = UUID.fromString(authentication.name)
        val result = alertService.createAlert(
            userId = userId,
            category = request.category,
            description = request.description,
            lat = request.lat,
            lng = request.lng
        )
        return ResponseEntity.ok(
            CreateAlertResponse(
                incident = IncidentDto.from(result.incident),
                merged = result.merged
            )
        )
    }

    @GetMapping("/incidents/active")
    fun getActiveIncidents(): ResponseEntity<List<IncidentDto>> {
        val incidents = alertService.getActiveIncidents()
            .map { IncidentDto.from(it) }
        return ResponseEntity.ok(incidents)
    }
}