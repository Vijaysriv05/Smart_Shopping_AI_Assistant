package com.workspace.apiserver.controller;

import com.auth0.jwt.interfaces.DecodedJWT;
import com.workspace.apiserver.model.User;
import com.workspace.apiserver.repository.UserRepository;
import com.workspace.apiserver.util.JwtUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            String password = body.get("password");
            String name = body.get("name");

            if (email == null || password == null || name == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "email, password, and name are required"));
            }
            if (password.length() < 6) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Password must be at least 6 characters"));
            }

            Optional<User> existing = userRepository.findByEmail(email);
            if (existing.isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", "Email already registered"));
            }

            String passwordHash = BCrypt.hashpw(password, BCrypt.gensalt(10));
            User user = User.builder()
                    .email(email)
                    .passwordHash(passwordHash)
                    .name(name)
                    .role("user")
                    .createdAt(new Date())
                    .build();

            User saved = userRepository.save(user);
            String token = JwtUtils.signToken(String.valueOf(saved.getId()), saved.getEmail(), saved.getName(), saved.getRole());

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "token", token,
                    "user", Map.of(
                            "id", saved.getId(),
                            "email", saved.getEmail(),
                            "name", saved.getName(),
                            "role", saved.getRole()
                    )
            ));
        } catch (Exception e) {
            log.error("Registration failed: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Registration failed"));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            String password = body.get("password");

            if (email == null || password == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "email and password are required"));
            }

            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty() || !BCrypt.checkpw(password, userOpt.get().getPasswordHash())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid email or password"));
            }

            User user = userOpt.get();
            String token = JwtUtils.signToken(String.valueOf(user.getId()), user.getEmail(), user.getName(), user.getRole());

            return ResponseEntity.ok(Map.of(
                    "token", token,
                    "user", Map.of(
                            "id", user.getId(),
                            "email", user.getEmail(),
                            "name", user.getName(),
                            "role", user.getRole()
                    )
            ));
        } catch (Exception e) {
            log.error("Login failed: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Login failed"));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(HttpServletRequest request) {
        try {
            String header = request.getHeader("Authorization");
            if (header == null || !header.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }

            String token = header.substring(7);
            DecodedJWT decoded = JwtUtils.verifyToken(token);
            if (decoded == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid or expired token"));
            }

            return ResponseEntity.ok(Map.of(
                    "user", Map.of(
                            "id", Integer.parseInt(decoded.getSubject()),
                            "email", decoded.getClaim("email").asString(),
                            "name", decoded.getClaim("name").asString(),
                            "role", decoded.getClaim("role").asString()
                    )
            ));
        } catch (Exception e) {
            log.error("Auth me check failed: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
