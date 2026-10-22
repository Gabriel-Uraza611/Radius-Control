package com.radiuscontrol.shared.error

import com.fasterxml.jackson.annotation.JsonInclude
import java.time.OffsetDateTime

/**
 * Standardized API error response format.
 * All error responses from the backend follow this structure.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
data class ApiError(
    val status: Int,
    val error: String,
    val message: String,
    val timestamp: OffsetDateTime = OffsetDateTime.now(),
    val path: String? = null,
    val fieldErrors: Map<String, String>? = null
) {
    companion object {
        fun of(status: Int, error: String, message: String, path: String? = null): ApiError {
            return ApiError(status = status, error = error, message = message, path = path)
        }

        fun validationError(fieldErrors: Map<String, String>, path: String? = null): ApiError {
            return ApiError(
                status = 400,
                error = "Validation Error",
                message = "Invalid request parameters",
                path = path,
                fieldErrors = fieldErrors
            )
        }
    }
}