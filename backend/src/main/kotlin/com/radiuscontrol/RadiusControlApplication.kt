package com.radiuscontrol

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class RadiusControlApplication

fun main(args: Array<String>) {
    runApplication<RadiusControlApplication>(*args)
}