package com.radiuscontrol.auth

import org.springframework.messaging.Message
import org.springframework.messaging.MessageChannel
import org.springframework.messaging.simp.stomp.StompCommand
import org.springframework.messaging.simp.stomp.StompHeaderAccessor
import org.springframework.messaging.support.ChannelInterceptor
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import java.util.Collections

@Component
class StompAuthInterceptor(private val jwtService: JwtService) : ChannelInterceptor {

    override fun preSend(message: Message<*>, channel: MessageChannel): Message<*> {
        val accessor = StompHeaderAccessor.wrap(message)

        if (accessor.command == StompCommand.CONNECT) {
            val authHeader = accessor.getFirstNativeHeader("Authorization")
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                throw IllegalArgumentException("Missing or invalid Authorization header")
            }

            val token = authHeader.substring(7)
            if (!jwtService.validateToken(token)) {
                throw IllegalArgumentException("Invalid JWT token")
            }

            val userId = jwtService.extractUserId(token)
            val email = jwtService.extractEmail(token)
            val name = jwtService.extractName(token)

            val auth = UsernamePasswordAuthenticationToken(
                userId.toString(),
                null,
                Collections.singletonList(SimpleGrantedAuthority("ROLE_USER"))
            )
            SecurityContextHolder.getContext().authentication = auth
            accessor.user = auth
        }

        return message
    }
}