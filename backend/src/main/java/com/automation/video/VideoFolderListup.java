package com.automation.video;

import com.google.gson.*;
import com.automation.util.DbFunc;
import org.bytedeco.javacv.FFmpegFrameGrabber;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

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
 * Video folder listing and metadata extraction utility
 */
public class VideoFolderListup {
    private static final Logger logger = LoggerFactory.getLogger(VideoFolderListup.class);
    private static final Gson gson = new GsonBuilder().setPrettyPrinting().create();
    private static final String LOG_FILE_NAME = "folder_listup.json";
    private static final DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
            .withZone(ZoneId.systemDefault());

    /**
     * List all video files in a directory and extract metadata
     *
     * @param basePath Base directory path to scan
     * @return Map containing status and JSON file path
     */
    public static Map<String, Object> folderListup(String basePath) {
        List<Map<String, Object>> fileList = new ArrayList<>();
        Path basePathObj = Paths.get(basePath);
        Path resultJsonPath = Paths.get(System.getProperty("user.dir"), "file_list.json");

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
                    .map(filePath -> processVideoFile(filePath, count.incrementAndGet()))
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
     * Process a single video file and extract metadata
     *
     * @param filePath Path to the video file
     * @param id       File ID number
     * @return Map containing file metadata
     */
    private static Map<String, Object> processVideoFile(Path filePath, int id) {
        try {
            long fileSize = Files.size(filePath);
            if (fileSize == 0) {
                return null;
            }

            String fileName = filePath.getFileName().toString();
            String extension = getFileExtension(fileName).toLowerCase();
            String fileLength = "";

            // Extract video length if MP4
            if ("mp4".equals(extension)) {
                fileLength = getVideoLength(filePath.toString());
                if (fileLength.isEmpty()) {
                    fileLength = "00:00";
                }
            }

            // Get modification time
            long modifiedTime = Files.getLastModifiedTime(filePath).toMillis();
            String formattedModifiedTime = dateTimeFormatter.format(Instant.ofEpochMilli(modifiedTime));

            // Parse tags from filename
            String baseNameTag = fileName.replace(" - Made with Clipchamp", "")
                    .replace("." + extension, "");
            String[] tags = baseNameTag.split("-");

            Map<String, Object> fileInfo = new HashMap<>();
            fileInfo.put("id", id);
            fileInfo.put("name", fileName);
            fileInfo.put("path", filePath.toString());
            fileInfo.put("size", fileSize);
            fileInfo.put("extension", extension);
            fileInfo.put("length", fileLength);
            fileInfo.put("modified_time", formattedModifiedTime);
            fileInfo.put("tags", Arrays.asList(tags));

            return fileInfo;
        } catch (Exception e) {
            logger.error("Error processing file {}: {}", filePath, e.getMessage());
            return null;
        }
    }

    /**
     * Get video length using FFmpeg
     *
     * @param filePath Path to the video file
     * @return Formatted video length (MM:SS)
     */
    private static String getVideoLength(String filePath) {
        try {
            FFmpegFrameGrabber grabber = new FFmpegFrameGrabber(filePath);
            grabber.start();

            double frameRate = grabber.getFrameRate();
            long frameCount = grabber.getLengthInFrames();

            if (frameRate == 0) {
                logger.warn("Frame rate is zero for video: {}", filePath);
                grabber.release();
                return "";
            }

            double duration = frameCount / frameRate;
            int minutes = (int) (duration / 60);
            int seconds = (int) (duration % 60);

            grabber.release();

            return String.format("%02d:%02d", minutes, seconds);
        } catch (Throwable e) {
            logger.warn("Error getting video length for {}: {}", filePath, e.getMessage());
            return "";
        }
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
            logger.error("Usage: java VideoFolderListup <base_path>");
            System.exit(1);
        }

        Map<String, Object> result = folderListup(args[0]);
        System.out.println(gson.toJson(result));
    }
}
