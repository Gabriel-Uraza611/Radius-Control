# Runtime stage - copy pre-built JAR
# Para build multi-stage (más lento pero standalone), ver Dockerfile.multistage
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY target/radius-control-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]