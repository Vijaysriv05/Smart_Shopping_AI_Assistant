# Stage 1: Build the React frontend
FROM node:22-alpine AS frontend-builder
RUN npm install -g pnpm
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY artifacts/shopping-ai/package.json ./artifacts/shopping-ai/
COPY artifacts/mockup-sandbox/package.json ./artifacts/mockup-sandbox/
COPY lib/api-client-react/package.json ./lib/api-client-react/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @workspace/shopping-ai run build

# Stage 2: Build the Spring Boot backend
FROM maven:3.9.6-eclipse-temurin-17 AS backend-builder
WORKDIR /app
COPY artifacts/api-server-java /app/artifacts/api-server-java
# Copy the compiled React frontend static files to Spring Boot's resources/static directory
COPY --from=frontend-builder /app/artifacts/shopping-ai/dist/public /app/artifacts/api-server-java/src/main/resources/static
WORKDIR /app/artifacts/api-server-java
RUN mvn clean package -DskipTests

# Stage 3: Production runtime stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=backend-builder /app/artifacts/api-server-java/target/api-server-java-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 5000
ENTRYPOINT ["java", "-jar", "app.jar"]
