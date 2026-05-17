package com.automation.controller;

import com.automation.util.DbFunc;
import com.automation.image.ImageFolderListup;
import com.automation.image.ImageFilenameConverter;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * REST Controller for image file management
 */
@RestController
@RequestMapping("/management")
public class ImageManagementController {
    private static final Logger logger = LoggerFactory.getLogger(ImageManagementController.class);
    private static final Gson gson = new GsonBuilder().setPrettyPrinting().create();
    private static final Set<String> IMAGE_EXTENSIONS = Set.of("png", "jpg", "jpeg", "bmp", "gif", "webp");
    private static final Set<String> VIDEO_EXTENSIONS = Set.of("mp4", "avi", "mov", "mkv", "wmv", "flv", "webm");

    /**
     * GET /management/image/folder/get/relativePath
     * List immediate subdirectories
     */
    @GetMapping("/image/folder/get/relativePath")
    public Map<String, Object> getRelativePath(@RequestParam String basePath) {
        try {
            File baseDir = new File(basePath);

            if (!baseDir.exists()) {
                return Map.of(
                        "status", "error",
                        "message", "Path does not exist: " + basePath);
            }

            List<String> folders = new ArrayList<>();
            File[] files = baseDir.listFiles(File::isDirectory);

            if (files != null) {
                for (File file : files) {
                    folders.add(file.getName());
                }
                folders.sort(String::compareTo);
            }

            return Map.of(
                    "status", "success",
                    "folders", folders,
                    "total", folders.size());
        } catch (Exception e) {
            logger.error("Error getting relative path: {}", e.getMessage(), e);
            return Map.of(
                    "status", "error",
                    "message", e.getMessage());
        }
    }

    /**
     * GET /management/folder/pick/base
     * Open native folder picker on backend host and return selected base path.
     */
    @GetMapping("/folder/pick/base")
    public Map<String, Object> pickBaseFolder() {
        String psScript = String.join("",
                "Add-Type -AssemblyName System.Windows.Forms;",
                "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog;",
                "$dialog.Description = 'Select Base Folder';",
                "$dialog.ShowNewFolderButton = $false;",
                "if($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK){",
                "  Write-Output $dialog.SelectedPath",
                "}");

        ProcessBuilder pb = new ProcessBuilder(
                "powershell",
                "-NoProfile",
                "-STA",
                "-Command",
                psScript);

        pb.redirectErrorStream(true);

        try {
            Process process = pb.start();
            boolean completed = process.waitFor(180, TimeUnit.SECONDS);

            if (!completed) {
                process.destroyForcibly();
                return Map.of(
                        "status", "error",
                        "message", "Folder picker timed out.",
                        "base_path", "");
            }

            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append(System.lineSeparator());
                }
            }

            String selected = output.toString().trim();

            if (selected.isEmpty()) {
                return Map.of(
                        "status", "cancelled",
                        "base_path", "");
            }

            return Map.of(
                    "status", "success",
                    "base_path", selected);
        } catch (Exception e) {
            logger.error("Error opening folder picker: {}", e.getMessage(), e);
            return Map.of(
                    "status", "error",
                    "message", e.getMessage(),
                    "base_path", "");
        }
    }

    /**
     * GET /management/image/folder/check/json
     * Check if JSON file exists for image listing
     */
    @GetMapping("/image/folder/check/json")
    public Map<String, Object> checkExistingJsonFile() {
        try {
            String imageManagementPath = System.getProperty("user.dir") + "/script/image_management";
            String jsonFile = imageManagementPath + "/image_list.json";

            if (Files.exists(Paths.get(jsonFile))) {
                return Map.of(
                        "status", "success",
                        "exists", true,
                        "json_path", jsonFile);
            } else {
                return Map.of(
                        "status", "success",
                        "exists", false,
                        "json_path", "");
            }
        } catch (Exception e) {
            logger.error("Error checking JSON file: {}", e.getMessage(), e);
            return Map.of(
                    "status", "error",
                    "message", e.getMessage(),
                    "exists", false);
        }
    }

    /**
     * GET /management/image/folder/view/files
     * List all image files in a folder
     */
    @GetMapping("/image/folder/view/files")
    public Map<String, Object> folderListupEndpoint(@RequestParam String folderPath) {
        logger.info("Received folderPath: {}", folderPath);

        Map<String, Object> result = ImageFolderListup.folderListup(folderPath);

        if ("success".equals(result.get("status"))) {
            String jsonPath = (String) result.get("json_path");

            try {
                String jsonContent = new String(Files.readAllBytes(Paths.get(jsonPath)));
                List<?> files = gson.fromJson(jsonContent, List.class);

                logger.info("File list generated successfully");
                DbFunc.appendToJson("folder_listup.json", Map.of(
                        "status", "success",
                        "message", "Image folder listing completed",
                        "file_count", files.size()));

                return Map.of(
                        "status", "success",
                        "json_path", jsonPath,
                        "files", files);
            } catch (IOException e) {
                logger.error("Error reading JSON file: {}", e.getMessage(), e);
                return Map.of(
                        "status", "error",
                        "json_path", "",
                        "message", e.getMessage());
            }
        } else {
            return Map.of(
                    "status", "error",
                    "json_path", "",
                    "message", result.getOrDefault("message", "Unknown error"));
        }
    }

    /**
     * GET /management/image/serve
     * Serve a local image file directly to the browser.
     */
    @GetMapping("/image/serve")
    public ResponseEntity<Resource> serveImage(@RequestParam String path) {
        try {
            Path imagePath = Paths.get(path);

            if (!Files.exists(imagePath) || !Files.isRegularFile(imagePath)) {
                return ResponseEntity.notFound().build();
            }

            String lowerName = imagePath.getFileName().toString().toLowerCase(Locale.ROOT);
            MediaType mediaType;
            if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
                mediaType = MediaType.IMAGE_JPEG;
            } else if (lowerName.endsWith(".gif")) {
                mediaType = MediaType.IMAGE_GIF;
            } else if (lowerName.endsWith(".bmp")) {
                mediaType = MediaType.parseMediaType("image/bmp");
            } else if (lowerName.endsWith(".webp")) {
                mediaType = MediaType.parseMediaType("image/webp");
            } else if (lowerName.endsWith(".svg")) {
                mediaType = MediaType.parseMediaType("image/svg+xml");
            } else {
                mediaType = MediaType.IMAGE_PNG;
            }

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"" + imagePath.getFileName().toString() + "\"")
                    .contentType(mediaType)
                    .body(new FileSystemResource(imagePath));
        } catch (Exception e) {
            logger.error("Error serving image {}: {}", path, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * POST /management/image/file/rename
     * Rename an image file
     */
    @PostMapping("/image/file/rename")
    public Map<String, Object> renameImageFile(@RequestBody Map<String, String> request) {
        String oldPath = request.get("oldPath");
        String newPath = request.get("newPath");

        if (oldPath == null || newPath == null) {
            return Map.of(
                    "status", "error",
                    "message", "Missing oldPath or newPath");
        }

        return ImageFilenameConverter.fileNameConverter(oldPath, newPath);
    }

    /**
     * POST /management/file/tag/add (legacy)
     * POST /management/image/file/tag/add
     * Add a single tag to one file entry in JSON cache.
     */
    @PostMapping({ "/file/tag/add", "/image/file/tag/add" })
    public Map<String, Object> addTagToFile(@RequestBody Map<String, Object> request) {
        try {
            if (request == null) {
                return errorResponse("request body is required");
            }

            String jsonPath = String.valueOf(request.getOrDefault("jsonPath", ""));
            Object fileIdObj = request.get("fileId");
            String tag = String.valueOf(request.getOrDefault("tag", "")).trim();

            if (jsonPath.isBlank()) {
                return Map.of("status", "error", "message", "jsonPath is required");
            }
            if (fileIdObj == null) {
                return Map.of("status", "error", "message", "fileId is required");
            }
            if (tag.isBlank()) {
                return Map.of("status", "error", "message", "tag is required");
            }

            int fileId = (fileIdObj instanceof Number)
                    ? ((Number) fileIdObj).intValue()
                    : Integer.parseInt(String.valueOf(fileIdObj));

            Map<String, Object> update = new HashMap<>();
            update.put("fileId", fileId);
            update.put("tags", List.of(tag));

            return applyTagUpdates(jsonPath, List.of(update));
        } catch (Exception e) {
            logger.error("Error adding tag: {}", e.getMessage(), e);
            return errorResponse(e);
        }
    }

    /**
     * POST /management/file/tag/batch-add (legacy)
     * POST /management/image/file/tag/batch-add
     * Add tags to multiple file entries in JSON cache.
     */
    @PostMapping({ "/file/tag/batch-add", "/image/file/tag/batch-add" })
    public Map<String, Object> batchAddTagsToFiles(@RequestBody Map<String, Object> request) {
        try {
            if (request == null) {
                return errorResponse("request body is required");
            }

            String jsonPath = String.valueOf(request.getOrDefault("jsonPath", ""));
            Object updatesObj = request.get("updates");

            if (jsonPath.isBlank()) {
                return Map.of("status", "error", "message", "jsonPath is required");
            }
            if (!(updatesObj instanceof List<?>)) {
                return Map.of("status", "error", "message", "updates is required");
            }
            List<?> updates = (List<?>) updatesObj;
            if (updates.isEmpty()) {
                return Map.of("status", "error", "message", "updates is required");
            }

            return applyTagUpdates(jsonPath, updates);
        } catch (Exception e) {
            logger.error("Error applying batch tags: {}", e.getMessage(), e);
            return errorResponse(e);
        }
    }

    private Map<String, Object> errorResponse(Exception e) {
        String message = e.getMessage();
        if (message == null || message.isBlank()) {
            message = e.getClass().getSimpleName();
        }
        return errorResponse(message);
    }

    private Map<String, Object> errorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "error");
        response.put("message", message == null || message.isBlank() ? "unknown error" : message);
        return response;
    }

    private Map<String, Object> applyTagUpdates(String jsonPath, List<?> updates) throws IOException {
        Path jsonFilePath = Paths.get(jsonPath);
        if (!Files.exists(jsonFilePath) || !Files.isRegularFile(jsonFilePath)) {
            return Map.of("status", "error", "message", "JSON file does not exist: " + jsonPath);
        }

        Type listType = new TypeToken<List<Map<String, Object>>>() {
        }.getType();
        List<Map<String, Object>> files = gson.fromJson(Files.readString(jsonFilePath), listType);
        if (files == null) {
            files = new ArrayList<>();
        }

        Map<Integer, Map<String, Object>> byId = new HashMap<>();
        for (Map<String, Object> file : files) {
            Object idObj = file.get("id");
            if (idObj == null) {
                continue;
            }
            int id = (idObj instanceof Number)
                    ? ((Number) idObj).intValue()
                    : Integer.parseInt(String.valueOf(idObj));
            byId.put(id, file);
        }

        int updatedCount = 0;
        for (Object updateObj : updates) {
            if (!(updateObj instanceof Map<?, ?>)) {
                continue;
            }
            Map<?, ?> rawUpdate = (Map<?, ?>) updateObj;

            Object fileIdObj = rawUpdate.get("fileId");
            Object tagsObj = rawUpdate.get("tags");
            Object removeTagsObj = rawUpdate.get("removeTags");
            if (fileIdObj == null) {
                continue;
            }

            List<?> incomingTags = tagsObj instanceof List<?> ? (List<?>) tagsObj : Collections.emptyList();
            List<?> removeTags = removeTagsObj instanceof List<?> ? (List<?>) removeTagsObj : Collections.emptyList();

            if (incomingTags.isEmpty() && removeTags.isEmpty()) {
                continue;
            }

            int fileId = (fileIdObj instanceof Number)
                    ? ((Number) fileIdObj).intValue()
                    : Integer.parseInt(String.valueOf(fileIdObj));

            Map<String, Object> target = byId.get(fileId);
            if (target == null) {
                continue;
            }

            Set<String> merged = new LinkedHashSet<>();
            Object currentTagsObj = target.get("tags");
            if (currentTagsObj instanceof List<?>) {
                List<?> currentTags = (List<?>) currentTagsObj;
                for (Object value : currentTags) {
                    String tag = String.valueOf(value).trim();
                    if (!tag.isBlank()) {
                        merged.add(tag);
                    }
                }
            }

            for (Object value : removeTags) {
                String tag = String.valueOf(value).trim();
                if (!tag.isBlank()) {
                    merged.remove(tag);
                }
            }

            for (Object value : incomingTags) {
                String tag = String.valueOf(value).trim();
                if (!tag.isBlank()) {
                    merged.add(tag);
                }
            }

            target.put("tags", new ArrayList<>(merged));
            updatedCount++;
        }

        Files.writeString(jsonFilePath, gson.toJson(files));

        return Map.of(
                "status", "success",
                "updated_count", updatedCount,
                "files", files,
                "json_path", jsonPath);
    }

    /**
     * GET /management/image/health
     * Health check endpoint
     */
    @GetMapping("/image/health")
    public Map<String, Object> imageHealth() {
        return Map.of(
                "status", "success",
                "message", "Image management API is running",
                "timestamp", System.currentTimeMillis());
    }

}
