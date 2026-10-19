package com.radiuscontrol.user

import jakarta.persistence.Entity
import jakarta.persistence.Table
import jakarta.persistence.Id
import jakarta.persistence.Column
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import java.time.OffsetDateTime
import java.util.UUID

@Entity
@Table(name = "users")
data class User(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    val id: UUID? = null,

    @Column(nullable = false, length = 255)
    val name: String,

    @Column(nullable = false, unique = true, length = 255)
    val email: String,

    @Column(name = "password_hash", nullable = false, length = 255)
    val passwordHash: String,

    @Column(name = "created_at", nullable = false, updatable = false, columnDefinition = "timestamptz")
    val createdAt: OffsetDateTime = OffsetDateTime.now()
)