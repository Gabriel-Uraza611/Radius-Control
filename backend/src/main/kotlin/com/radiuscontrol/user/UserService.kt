package com.radiuscontrol.user

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class UserService(private val userRepository: UserRepository) {

    @Transactional
    fun createUser(name: String, email: String, passwordHash: String): User {
        val user = User(name = name, email = email, passwordHash = passwordHash)
        return userRepository.save(user)
    }

    fun findByEmail(email: String): User? = userRepository.findByEmail(email)

    fun findById(id: UUID): User? = userRepository.findById(id).orElse(null)

    fun existsByEmail(email: String): Boolean = userRepository.existsByEmail(email)
}