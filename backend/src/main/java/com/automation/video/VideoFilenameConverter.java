package com.automation.video;

import com.automation.util.DbFunc;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

/**
 * Video file rename utility
 */
public class VideoFilenameConverter {
    private static final Logger logger = LoggerFactory.getLogger(VideoFilenameConverter.class);
    private static final String LOG_FILE_NAME = "filename_convert.json";

    /**
     * Rename a video file
     *
     * @param oldPath Current file path
     * @param newPath New file path
     * @return Map containing status and file paths
     */
    public static Map<String, Object> fileNameConverter(String oldPath, String newPath) {
        try {
            Path oldPathObj = Paths.get(oldPath);
            Path newPathObj = Paths.get(newPath);

            if (!Files.exists(oldPathObj)) {
                logger.error("Source file does not exist: {}", oldPath);
                DbFunc.appendToJson(LOG_FILE_NAME, Map.of(
                        "status", "error",
                        "message", "Source file does not exist: " + oldPath));
                return createErrorResponse("Source file does not exist: " + oldPath);
            }

            // Ensure parent directory exists
            Files.createDirectories(newPathObj.getParent());

            // Rename file
            Files.move(oldPathObj, newPathObj);

            logger.info("File renamed successfully from {} to {}", oldPath, newPath);
            DbFunc.appendToJson(LOG_FILE_NAME, Map.of(
                    "status", "success",
                    "message", "File rename completed",
                    "old_path", oldPath,
                    "new_path", newPath));

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("old_path", oldPath);
            response.put("new_path", newPath);
            return response;
        } catch (IOException e) {
            logger.error("Error renaming file: {}", e.getMessage(), e);
            DbFunc.appendToJson(LOG_FILE_NAME, Map.of(
                    "status", "error",
                    "message", "Error renaming file: " + e.getMessage()));
            return createErrorResponse("Error renaming file: " + e.getMessage());
        }
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

    /**
     * Main method for testing
     */
    public static void main(String[] args) {
        if (args.length < 2) {
            logger.error("Usage: java VideoFilenameConverter <old_path> <new_path>");
            System.exit(1);
        }

        Map<String, Object> result = fileNameConverter(args[0], args[1]);
        System.out.println(result);
    }
}
