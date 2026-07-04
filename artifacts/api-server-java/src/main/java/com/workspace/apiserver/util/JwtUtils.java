package com.workspace.apiserver.util;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.auth0.jwt.interfaces.JWTVerifier;

import java.util.Date;

public class JwtUtils {
    private static final String SECRET = "dev-shopping-ai-secret-change-in-production";
    private static final Algorithm algorithm = Algorithm.HMAC256(SECRET);

    public static String signToken(String id, String email, String name, String role) {
        return JWT.create()
                .withSubject(id)
                .withClaim("email", email)
                .withClaim("name", name)
                .withClaim("role", role)
                .withExpiresAt(new Date(System.currentTimeMillis() + 7 * 24 * 60 * 60 * 1000L)) // 7 days
                .sign(algorithm);
    }

    public static DecodedJWT verifyToken(String token) {
        try {
            JWTVerifier verifier = JWT.require(algorithm).build();
            return verifier.verify(token);
        } catch (Exception e) {
            return null;
        }
    }
}
