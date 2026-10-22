package com.radiuscontrol.auth

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class RegisterRequest(
    @NotBlank @Size(max = 255)
    val name: String,

    @NotBlank @Email @Size(max = 255)
    val email: String,

    @NotBlank @Size(min = 8, max = 255)
    val password: String
)

data class LoginRequest(
    @NotBlank @Email @Size(max = 255)
    val email: String,

    @NotBlank @Size(max = 255)
    val password: String
)

data class AuthResponse(
    val token: String,
    val user: UserDto
)

data class UserDto(
    val id: String,
    val name: String,
    val email: String
)