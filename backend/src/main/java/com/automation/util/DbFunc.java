package com.automation.util;

import com.google.gson.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Utility class for database and JSON operations (Development version with
 * mocked MongoDB)
 */
public class DbFunc {
    private static final Logger logger = LoggerFactory.getLogger(DbFunc.class);
    private static final Gson gson = new GsonBuilder().setPrettyPrinting().create();
    private static final DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /**
     * Append data to a JSON log file. Creates the file if it doesn't exist.
     *
     * @param jsonFileName Name of the JSON file
     * @param newData      Data to append
     */
    public static void appendToJson(String jsonFileName, Map<String, Object> newData) {
        String filePath = getJsonLogFilePath(jsonFileName);

        try {
            Files.createDirectories(Paths.get(filePath).getParent());

            List<Map<String, Object>> existingData = new ArrayList<>();
            if (Files.exists(Paths.get(filePath))) {
                String content = new String(Files.readAllBytes(Paths.get(filePath)), StandardCharsets.UTF_8);
                if (!content.trim().isEmpty()) {
                    JsonArray jsonArray = JsonParser.parseString(content).getAsJsonArray();
                    jsonArray.forEach(elem -> existingData.add(gson.fromJson(elem, Map.class)));
                }
            }

            Map<String, Object> dataToAppend = new HashMap<>();
            if (newData != null) {
                dataToAppend.putAll(newData);
            }
            dataToAppend.put("script_name", jsonFileName.replace(".json", ""));
            dataToAppend.put("timestamp", LocalDateTime.now().format(dateTimeFormatter));
            existingData.add(dataToAppend);

            String jsonContent = gson.toJson(existingData);
            Files.write(Paths.get(filePath), jsonContent.getBytes(StandardCharsets.UTF_8));

            logger.info("Successfully appended to JSON file: {}", filePath);
        } catch (IOException e) {
            logger.error("Error appending to JSON file: {}", e.getMessage(), e);
        }
    }

    /**
     * Delete a JSON log file
     *
     * @param fileName Name of the JSON file to delete
     */
    public static void deleteJson(String fileName) {
        String filePath = getJsonLogFilePath(fileName);
        try {
            if (Files.exists(Paths.get(filePath))) {
                Files.delete(Paths.get(filePath));
                logger.info("Deleted JSON file: {}", filePath);
            }
        } catch (IOException e) {
            logger.error("Error deleting JSON file: {}", e.getMessage(), e);
        }
    }

    /**
     * Recover data from a JSON log file (Mocked - Development Only)
     *
     * @param tableName MongoDB table name (ignored in development)
     * @param fileName  Name of the JSON file
     * @return Map containing status and data
     */
    public static Map<String, Object> jsonRecover(String tableName, String fileName) {
        String filePath = getJsonLogFilePath(fileName);

        try {
            if (!Files.exists(Paths.get(filePath))) {
                logger.warn("JSON file does not exist: {}", filePath);
                return createErrorResponse("JSON file does not exist");
            }

            String content = new String(Files.readAllBytes(Paths.get(filePath)), StandardCharsets.UTF_8);
            JsonElement jsonElement = JsonParser.parseString(content);

            // Mocked: Log to console instead of inserting to MongoDB
            logger.info("MOCK: Would insert data to MongoDB collection '{}' from file '{}'", tableName, fileName);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("data", jsonElement);
            response.put("note", "DEVELOPMENT: Data logged but not inserted to MongoDB");
            return response;
        } catch (IOException e) {
            logger.error("Error reading JSON file: {}", e.getMessage(), e);
            return createErrorResponse("Error reading JSON file");
        }
    }

    /**
     * Insert log data into MongoDB (Mocked - Development Only)
     *
     * @param tableName    MongoDB collection name (ignored in development)
     * @param jsonFileName Name of the JSON file
     * @return Map containing status and message
     */
    public static Map<String, Object> logInsert(String tableName, String jsonFileName) {
        if (tableName == null || tableName.isEmpty() || jsonFileName == null || jsonFileName.isEmpty()) {
            return createErrorResponse("Table name or JSON file name is missing");
        }

        String filePath = getJsonLogFilePath(jsonFileName);

        try {
            if (!Files.exists(Paths.get(filePath))) {
                logger.warn("JSON file does not exist: {}", filePath);
                return createErrorResponse("JSON file does not exist: " + filePath);
            }

            String content = new String(Files.readAllBytes(Paths.get(filePath)), StandardCharsets.UTF_8);
            JsonElement jsonElement = JsonParser.parseString(content);

            // Mocked: Log to console instead of MongoDB
            logger.info("MOCK: Would insert data to MongoDB collection '{}'", tableName);
            logger.debug("MOCK: Data content: {}", jsonElement);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "DEVELOPMENT: Log operation recorded (MongoDB insert mocked)");
            response.put("table", tableName);
            response.put("file", jsonFileName);
            return response;
        } catch (IOException e) {
            logger.error("Error processing log file: {}", e.getMessage(), e);
            return createErrorResponse("Error processing log: " + e.getMessage());
        }
    }

    /**
     * Get the full path for JSON log file
     *
     * @param fileName Name of the JSON file
     * @return Full file path
     */
    private static String getJsonLogFilePath(String fileName) {
        String baseDir = System.getProperty("user.dir");
        return Paths.get(baseDir, "json", "log", fileName).toString();
    }

    /**
     * Create an error response map
     *
     * @param message Error message
     * @return Error response map
     */
    private static Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "error");
        response.put("message", message);
        return response;
    }
}
