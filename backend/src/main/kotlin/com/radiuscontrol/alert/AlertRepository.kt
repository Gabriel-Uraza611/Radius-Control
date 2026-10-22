package com.radiuscontrol.alert

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface AlertRepository : JpaRepository<Alert, UUID> {

    @Query("SELECT CASE WHEN COUNT(a) > 0 THEN true ELSE false END FROM Alert a WHERE a.userId = :userId AND a.incidentId = :incidentId")
    fun existsByUserIdAndIncidentId(@Param("userId") userId: UUID, @Param("incidentId") incidentId: UUID): Boolean
}