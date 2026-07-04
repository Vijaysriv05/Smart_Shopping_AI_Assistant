package com.workspace.apiserver.util;

import jakarta.servlet.http.HttpServletRequest;

public class SessionUtils {
    public static String getSessionId(HttpServletRequest request, String bodySessionId) {
        String header = request.getHeader("x-session-id");
        if (header != null && !header.trim().isEmpty()) {
            return header.trim();
        }
        String query = request.getParameter("sessionId");
        if (query != null && !query.trim().isEmpty()) {
            return query.trim();
        }
        if (bodySessionId != null && !bodySessionId.trim().isEmpty()) {
            return bodySessionId.trim();
        }
        return "default";
    }
}
