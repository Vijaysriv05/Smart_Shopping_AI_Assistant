package com.workspace.apiserver.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.workspace.apiserver.model.Product;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;

@Service
@Slf4j
@RequiredArgsConstructor
public class AiService {

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private static final List<String> GEMINI_MODELS = List.of(
            "gemini-2.0-flash",
            "gemini-1.5-flash"
    );

    /**
     * Call Gemini API with the given prompt and optional json mode.
     */
    public String callGemini(String prompt, boolean jsonMode) {
        if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
            throw new IllegalStateException("GEMINI_API_KEY is not configured");
        }

        Exception lastException = null;
        for (String modelName : GEMINI_MODELS) {
            try {
                String url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + geminiApiKey;

                // Build payload
                Map<String, Object> textPart = Map.of("text", prompt);
                Map<String, Object> partContainer = Map.of("parts", List.of(textPart));
                Map<String, Object> payload = new HashMap<>();
                payload.put("contents", List.of(partContainer));

                if (jsonMode) {
                    payload.put("generationConfig", Map.of("responseMimeType", "application/json"));
                }

                String requestBody = objectMapper.writeValueAsString(payload);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                        .timeout(Duration.ofSeconds(8))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() == 200) {
                    JsonNode root = objectMapper.readTree(response.body());
                    // Extract text from candidates[0].content.parts[0].text
                    JsonNode textNode = root.path("candidates").path(0)
                            .path("content").path("parts").path(0).path("text");
                    
                    if (!textNode.isMissingNode()) {
                        return textNode.asText();
                    }
                } else {
                    log.warn("Gemini model {} returned status code: {} - {}", modelName, response.statusCode(), response.body());
                    throw new RuntimeException("HTTP status " + response.statusCode());
                }
            } catch (Exception e) {
                lastException = e;
                log.warn("Gemini model {} invocation failed: {}", modelName, e.getMessage());
                if (e.getMessage() != null && (e.getMessage().contains("status 400") || e.getMessage().contains("status 403") || e.getMessage().contains("status 429"))) {
                    break;
                }
            }
        }
        throw new RuntimeException("All Gemini models failed. Last exception: " + (lastException != null ? lastException.getMessage() : "Unknown error"));
    }

    /**
     * Extract budget from query using regex.
     */
    public Double extractBudgetFromQuery(String query) {
        if (query == null) return null;
        String q = query.toLowerCase();
        
        List<String> regexes = List.of(
                "under\\s+\\$?\\s*([\\d,]+(?:\\.\\d+)?)\\s*(k|K)?",
                "below\\s+\\$?\\s*([\\d,]+(?:\\.\\d+)?)\\s*(k|K)?",
                "budget\\s+(?:of\\s+)?\\$?\\s*([\\d,]+(?:\\.\\d+)?)\\s*(k|K)?",
                "₹\\s*([\\d,]+(?:\\.\\d+)?)\\s*(k|K|lakh|lakhs)?",
                "\\$\\s*([\\d,]+(?:\\.\\d+)?)\\s*(k|K)?"
        );

        for (String regex : regexes) {
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(regex);
            java.util.regex.Matcher matcher = pattern.matcher(q);
            if (matcher.find()) {
                try {
                    double value = Double.parseDouble(matcher.group(1).replace(",", ""));
                    String suffix = matcher.group(2);
                    if (suffix != null) {
                        suffix = suffix.toLowerCase();
                        if (suffix.equals("k")) {
                            value *= 1000;
                        } else if (suffix.equals("lakh") || suffix.equals("lakhs")) {
                            value *= 100000;
                        }
                    }
                    return value;
                } catch (NumberFormatException e) {
                    // Ignore
                }
            }
        }
        return null;
    }
}
