package com.automation.image;

import com.google.gson.*;
import com.automation.util.DbFunc;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

/**
 * Image folder listing and metadata extraction utility
 */
public class ImageFolderListup {
    private static final Logger logger = LoggerFactory.getLogger(ImageFolderListup.class);
    private static final Gson gson = new GsonBuilder().setPrettyPrinting().create();
    private static final String LOG_FILE_NAME = "folder_listup.json";
    private static final DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
            .withZone(ZoneId.systemDefault());

    /**
     * List all image files in a directory and extract metadata
     *
     * @param basePath Base directory path to scan
     * @return Map containing status and JSON file path
     */
    public static Map<String, Object> folderListup(String basePath) {
        List<Map<String, Object>> fileList = new ArrayList<>();
        Path basePathObj = Paths.get(basePath);
        Path resultJsonPath = Paths.get(System.getProperty("user.dir"), "image_list.json");

        try {
            // Clean up existing file list
            if (Files.exists(resultJsonPath)) {
                Files.delete(resultJsonPath);
            }

            // Scan directories for file counts
            Map<String, Long> folderFileList = new HashMap<>();
            try (var stream = Files.walk(basePathObj)) {
                stream.filter(Files::isDirectory)
                        .forEach(dir -> {
                            try (var files = Files.walk(dir)) {
                                long count = files.filter(Files::isRegularFile).count();
                                if (count > 0) {
                                    String dirName = dir.getFileName() != null ? dir.getFileName().toString()
                                            : dir.toString();
                                    folderFileList.put(dirName, count);
                                }
                            } catch (IOException e) {
                                logger.error("Error scanning directory: {}", dir, e);
                            }
                        });
            }

            DbFunc.appendToJson(LOG_FILE_NAME, Map.of("status", "success", "message", "Folder listup successful"));
        } catch (Exception e) {
            logger.error("Error listing folders: {}", e.getMessage(), e);
            DbFunc.appendToJson(LOG_FILE_NAME,
                    Map.of("status", "error", "message", "Error listing folders: " + e.getMessage()));
            return createErrorResponse("Error listing folders: " + e.getMessage());
        }

        AtomicInteger count = new AtomicInteger(0);
        try (var stream = Files.walk(basePathObj)) {
            fileList = stream.filter(Files::isRegularFile)
                    .map(filePath -> processImageFile(filePath, count.incrementAndGet()))
                    .filter(Objects::nonNull)
                    .sorted(Comparator.comparing((Map<String, Object> m) -> ((String) m.get("name")).toLowerCase()))
                    .collect(Collectors.toList());

            DbFunc.appendToJson(LOG_FILE_NAME, Map.of("status", "success", "message", "File listup successful"));
        } catch (Exception e) {
            logger.error("Error listing files: {}", e.getMessage(), e);
            DbFunc.appendToJson(LOG_FILE_NAME,
                    Map.of("status", "error", "message", "Error listing files: " + e.getMessage()));
            return createErrorResponse("Error listing files: " + e.getMessage());
        }

        // Save to JSON file
        try {
            String jsonContent = gson.toJson(fileList);
            Files.write(resultJsonPath, jsonContent.getBytes(StandardCharsets.UTF_8));
            logger.info("File list saved to: {}", resultJsonPath);
        } catch (IOException e) {
            logger.error("Error saving file list: {}", e.getMessage(), e);
            DbFunc.appendToJson(LOG_FILE_NAME,
                    Map.of("status", "error", "message", "Error saving file list: " + e.getMessage()));
            return createErrorResponse("Error saving file list: " + e.getMessage());
        }

        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("json_path", resultJsonPath.toString());
        return response;
    }

    /**
     * Process a single image file and extract metadata
     *
     * @param filePath Path to the image file
     * @param id       File ID number
     * @return Map containing file metadata
     */
    private static Map<String, Object> processImageFile(Path filePath, int id) {
        try {
            long fileSize = Files.size(filePath);
            if (fileSize == 0) {
                return null;
            }

            String fileName = filePath.getFileName().toString();
            String extension = getFileExtension(fileName).toLowerCase();

            // Skip non-image files
            if (!isImageFile(extension)) {
                return null;
            }

            // Get image dimensions
            String imageDimensions = getImageDimensions(filePath);

            // Get modification time
            long modifiedTime = Files.getLastModifiedTime(filePath).toMillis();
            String formattedModifiedTime = dateTimeFormatter.format(Instant.ofEpochMilli(modifiedTime));

            // Parse tags from filename
            String baseNameTag = fileName.replace("." + extension, "");
            String[] tags = baseNameTag.split("-");

            Map<String, Object> fileInfo = new HashMap<>();
            fileInfo.put("id", id);
            fileInfo.put("name", fileName);
            fileInfo.put("path", filePath.toString());
            fileInfo.put("size", fileSize);
            fileInfo.put("extension", extension);
            fileInfo.put("dimensions", imageDimensions);
            fileInfo.put("modified_time", formattedModifiedTime);
            fileInfo.put("tags", Arrays.asList(tags));

            return fileInfo;
        } catch (IOException e) {
            logger.error("Error processing file {}: {}", filePath, e.getMessage());
            return null;
        }
    }

    /**
     * Get image dimensions
     *
     * @param filePath Path to the image file
     * @return Image dimensions as "WIDTHxHEIGHT" or empty string if cannot be
     *         determined
     */
    private static String getImageDimensions(Path filePath) {
        try {
            BufferedImage image = ImageIO.read(filePath.toFile());
            if (image != null) {
                return image.getWidth() + "x" + image.getHeight();
            }
        } catch (IOException e) {
            logger.debug("Could not read image dimensions for {}: {}", filePath, e.getMessage());
        }
        return "";
    }

    /**
     * Check if file extension is an image format
     *
     * @param extension File extension
     * @return True if it's an image file
     */
    private static boolean isImageFile(String extension) {
        return extension.matches("png|jpg|jpeg|bmp|gif|webp|tiff");
    }

    /**
     * Get file extension from filename
     *
     * @param fileName Name of the file
     * @return File extension without the dot
     */
    private static String getFileExtension(String fileName) {
        int lastDot = fileName.lastIndexOf(".");
        return lastDot > 0 ? fileName.substring(lastDot + 1) : "";
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
        if (args.length < 1) {
            logger.error("Usage: java ImageFolderListup <base_path>");
            System.exit(1);
        }

        Map<String, Object> result = folderListup(args[0]);
        System.out.println(gson.toJson(result));
    }
}
