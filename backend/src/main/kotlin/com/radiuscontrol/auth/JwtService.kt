package com.radiuscontrol.auth

import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import jakarta.annotation.PostConstruct
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.nio.charset.StandardCharsets
import java.security.Key
import javax.crypto.SecretKey
import java.time.Instant
import java.util.Date
import java.util.UUID

@Component
class JwtService(
    @Value("\${app.jwt.secret}") private val secret: String,
    @Value("\${app.jwt.expiration-minutes:60}") private val expirationMinutes: Long
) {

    private var key: SecretKey? = null

    @PostConstruct
    fun init() {
        require(secret.length >= 32) { "JWT secret must be at least 32 characters" }
        key = Keys.hmacShaKeyFor(secret.toByteArray(StandardCharsets.UTF_8))
    }

    fun generateToken(userId: UUID, email: String, name: String): String {
        val now = Instant.now()
        val expiry = now.plusSeconds(expirationMinutes * 60)

        return Jwts.builder()
            .subject(userId.toString())
            .claim("email", email)
            .claim("name", name)
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiry))
            .signWith(key!!)
            .compact()
    }

    fun validateToken(token: String): Boolean {
        try {
            Jwts.parser().verifyWith(key!!).build().parseSignedClaims(token)
            return true
        } catch (e: Exception) {
            return false
        }
    }

    fun extractUserId(token: String): UUID {
        val claims = parseClaims(token)
        return UUID.fromString(claims.subject)
    }

    fun extractEmail(token: String): String {
        val claims = parseClaims(token)
        return claims.get("email", String::class.java)
    }

    fun extractName(token: String): String {
        val claims = parseClaims(token)
        return claims.get("name", String::class.java)
    }

    private fun parseClaims(token: String): Claims {
        return Jwts.parser().verifyWith(key!!).build().parseSignedClaims(token).payload
    }
}