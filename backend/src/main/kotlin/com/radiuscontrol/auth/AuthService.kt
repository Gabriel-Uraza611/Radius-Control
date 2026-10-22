package com.radiuscontrol.auth

import com.radiuscontrol.user.UserService
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional
class AuthService(
    private val userService: UserService,
    private val jwtService: JwtService,
    private val passwordEncoder: PasswordEncoder
) {

    fun register(request: RegisterRequest): AuthResponse {
        if (userService.existsByEmail(request.email)) {
            throw IllegalArgumentException("Email ya registrado")
        }

        val passwordHash = passwordEncoder.encode(request.password)
        val user = userService.createUser(request.name, request.email, passwordHash)
        val token = jwtService.generateToken(user.id!!, user.email, user.name)

        return AuthResponse(token, UserDto(user.id.toString(), user.name, user.email))
    }

    fun login(request: LoginRequest): AuthResponse {
        val user = userService.findByEmail(request.email)
            ?: throw BadCredentialsException("Credenciales inválidas")

        if (!passwordEncoder.matches(request.password, user.passwordHash)) {
            throw BadCredentialsException("Credenciales inválidas")
        }

        val token = jwtService.generateToken(user.id!!, user.email, user.name)
        return AuthResponse(token, UserDto(user.id.toString(), user.name, user.email))
    }

    fun me(userId: String): UserDto {
        val user = userService.findById(UUID.fromString(userId))
            ?: throw IllegalArgumentException("Usuario no encontrado")
        return UserDto(user.id.toString(), user.name, user.email)
    }
}