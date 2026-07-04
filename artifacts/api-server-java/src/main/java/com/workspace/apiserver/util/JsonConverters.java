package com.workspace.apiserver.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;

import java.util.*;

@Slf4j
public class JsonConverters {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Converter
    public static class StringListConverter implements AttributeConverter<List<String>, String> {
        @Override
        public String convertToDatabaseColumn(List<String> attribute) {
            if (attribute == null) return "[]";
            try {
                return objectMapper.writeValueAsString(attribute);
            } catch (Exception e) {
                log.error("Failed to convert list to JSON string", e);
                return "[]";
            }
        }

        @Override
        public List<String> convertToEntityAttribute(String dbData) {
            if (dbData == null || dbData.trim().isEmpty()) return new ArrayList<>();
            try {
                return objectMapper.readValue(dbData, new TypeReference<List<String>>() {});
            } catch (Exception e) {
                log.error("Failed to convert JSON string to list", e);
                return new ArrayList<>();
            }
        }
    }

    @Converter
    public static class IntegerListConverter implements AttributeConverter<List<Integer>, String> {
        @Override
        public String convertToDatabaseColumn(List<Integer> attribute) {
            if (attribute == null) return "[]";
            try {
                return objectMapper.writeValueAsString(attribute);
            } catch (Exception e) {
                log.error("Failed to convert integer list to JSON string", e);
                return "[]";
            }
        }

        @Override
        public List<Integer> convertToEntityAttribute(String dbData) {
            if (dbData == null || dbData.trim().isEmpty()) return new ArrayList<>();
            try {
                return objectMapper.readValue(dbData, new TypeReference<List<Integer>>() {});
            } catch (Exception e) {
                log.error("Failed to convert JSON string to integer list", e);
                return new ArrayList<>();
            }
        }
    }

    @Converter
    public static class StringMapConverter implements AttributeConverter<Map<String, Object>, String> {
        @Override
        public String convertToDatabaseColumn(Map<String, Object> attribute) {
            if (attribute == null) return "{}";
            try {
                return objectMapper.writeValueAsString(attribute);
            } catch (Exception e) {
                log.error("Failed to convert map to JSON string", e);
                return "{}";
            }
        }

        @Override
        public Map<String, Object> convertToEntityAttribute(String dbData) {
            if (dbData == null || dbData.trim().isEmpty()) return new HashMap<>();
            try {
                return objectMapper.readValue(dbData, new TypeReference<Map<String, Object>>() {});
            } catch (Exception e) {
                log.error("Failed to convert JSON string to map", e);
                return new HashMap<>();
            }
        }
    }

    @Converter
    public static class ObjectListConverter implements AttributeConverter<List<Object>, String> {
        @Override
        public String convertToDatabaseColumn(List<Object> attribute) {
            if (attribute == null) return "[]";
            try {
                return objectMapper.writeValueAsString(attribute);
            } catch (Exception e) {
                log.error("Failed to convert list of objects to JSON string", e);
                return "[]";
            }
        }

        @Override
        public List<Object> convertToEntityAttribute(String dbData) {
            if (dbData == null || dbData.trim().isEmpty()) return new ArrayList<>();
            try {
                return objectMapper.readValue(dbData, new TypeReference<List<Object>>() {});
            } catch (Exception e) {
                log.error("Failed to convert JSON string to list of objects", e);
                return new ArrayList<>();
            }
        }
    }
}
