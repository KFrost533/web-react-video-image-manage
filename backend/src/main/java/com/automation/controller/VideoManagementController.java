package com.automation.controller;

import com.automation.util.DbFunc;
import com.automation.video.VideoFolderListup;
import com.automation.video.VideoFilenameConverter;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.bytedeco.javacv.FFmpegFrameGrabber;
import org.bytedeco.javacv.Frame;
import org.bytedeco.javacv.Java2DFrameConverter;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.lang.reflect.Type;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

/**
 * REST Controller for video file management
 */
@RestController
@RequestMapping("/management")
public class VideoManagementController {
    private static final Logger logger = LoggerFactory.getLogger(VideoManagementController.class);
    private static final Gson gson = new GsonBuilder().setPrettyPrinting().create();

    /**
     * GET /management/video/folder/get/relativePath
     * GET /management/folder/get/relativePath (legacy)
     * List immediate subdirectories
     */
    @GetMapping({ "/video/folder/get/relativePath", "/folder/get/relativePath" })
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
     * GET /management/video/folder/check/json
     * GET /management/folder/check/json (legacy)
     * Check if JSON file exists for video listing
     */
    @GetMapping({ "/video/folder/check/json", "/folder/check/json" })
    public Map<String, Object> checkExistingJsonFile() {
        try {
            String videoManagementPath = System.getProperty("user.dir") + "/script/video_management";
            String jsonFile = videoManagementPath + "/file_list.json";

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
     * GET /management/video/folder/view/files
     * GET /management/folder/view/files (legacy)
     * List all video files in a folder
     */
    @GetMapping({ "/video/folder/view/files", "/folder/view/files" })
    public Map<String, Object> folderListupEndpoint(@RequestParam String folderPath) {
        logger.info("Received folderPath: {}", folderPath);

        Map<String, Object> result = VideoFolderListup.folderListup(folderPath);

        if ("success".equals(result.get("status"))) {
            String jsonPath = (String) result.get("json_path");

            try {
                String jsonContent = new String(Files.readAllBytes(Paths.get(jsonPath)));
                List<?> files = gson.fromJson(jsonContent, List.class);

                logger.info("File list generated successfully");
                DbFunc.appendToJson("folder_listup.json", Map.of(
                        "status", "success",
                        "message", "Video folder listing completed",
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
     * POST /management/video/file/rename
     * Rename a video file
     */
    @PostMapping("/video/file/rename")
    public Map<String, Object> renameVideoFile(@RequestBody Map<String, String> request) {
        String oldPath = request.get("oldPath");
        String newPath = request.get("newPath");

        if (oldPath == null || newPath == null) {
            return Map.of(
                    "status", "error",
                    "message", "Missing oldPath or newPath");
        }

        return VideoFilenameConverter.fileNameConverter(oldPath, newPath);
    }

    /**
     * POST /management/file/changename/single (legacy)
     */
    @PostMapping("/file/changename/single")
    public Map<String, Object> renameSingleLegacy(@RequestBody Map<String, String> request) {
        return renameVideoFile(request);
    }

    /**
     * POST /management/file/changename/several (legacy)
     */
    @PostMapping("/file/changename/several")
    public Map<String, Object> renameSeveralLegacy(@RequestBody Map<String, Object> request) {
        try {
            String jsonPath = String.valueOf(request.getOrDefault("jsonPath", ""));
            Object idsObj = request.get("checkedFileIds");
            Object namesObj = request.get("checkedFileName");

            if (jsonPath.isBlank()) {
                return Map.of("status", "error", "message", "jsonPath is required");
            }
            if (!(idsObj instanceof List) || !(namesObj instanceof List)) {
                return Map.of("status", "error", "message", "checkedFileIds and checkedFileName are required");
            }

            List<?> ids = (List<?>) idsObj;
            List<?> names = (List<?>) namesObj;

            if (ids.size() != names.size()) {
                return Map.of("status", "error", "message", "checkedFileIds and checkedFileName size mismatch");
            }

            Path jsonFilePath = Paths.get(jsonPath);
            if (!Files.exists(jsonFilePath)) {
                return Map.of("status", "error", "message", "JSON file does not exist: " + jsonPath);
            }

            Type listType = new TypeToken<List<Map<String, Object>>>() {
            }.getType();
            List<Map<String, Object>> data = gson.fromJson(Files.readString(jsonFilePath), listType);
            if (data == null) {
                data = new ArrayList<>();
            }

            List<Map<String, Object>> result = new ArrayList<>();

            for (int i = 0; i < ids.size(); i++) {
                int targetId = Integer.parseInt(String.valueOf(ids.get(i)));
                String newName = String.valueOf(names.get(i));

                for (Map<String, Object> item : data) {
                    Object itemIdObj = item.get("id");
                    if (itemIdObj == null) {
                        continue;
                    }
                    int itemId = (itemIdObj instanceof Number)
                            ? ((Number) itemIdObj).intValue()
                            : Integer.parseInt(String.valueOf(itemIdObj));

                    if (itemId == targetId) {
                        String oldPath = String.valueOf(item.getOrDefault("path", ""));
                        if (oldPath.isBlank()) {
                            result.add(Map.of("status", "error", "message", "path is empty for id=" + targetId));
                            break;
                        }

                        String newPath = Paths.get(oldPath).getParent().resolve(newName).toString();
                        Map<String, Object> renameResult = VideoFilenameConverter.fileNameConverter(oldPath, newPath);

                        if ("success".equals(renameResult.get("status"))) {
                            item.put("path", newPath);
                            item.put("name", Paths.get(newPath).getFileName().toString());
                            result.add(Map.of("status", "success", "new_file_path", newPath));
                        } else {
                            result.add(Map.of(
                                    "status", "error",
                                    "message", String.valueOf(renameResult.getOrDefault("message", "Unknown error"))));
                        }
                        break;
                    }
                }
            }

            Files.writeString(jsonFilePath, gson.toJson(data));

            boolean allSuccess = !result.isEmpty() && result.stream().allMatch(r -> "success".equals(r.get("status")));
            if (allSuccess) {
                List<String> newPaths = result.stream()
                        .map(r -> String.valueOf(r.get("new_file_path")))
                        .toList();
                return Map.of("status", "success", "new_file_path", newPaths);
            }

            return Map.of("status", "error", "results", result);
        } catch (Exception e) {
            logger.error("Error in batch rename: {}", e.getMessage(), e);
            return Map.of("status", "error", "message", e.getMessage());
        }
    }

    /**
     * GET /management/json/list/files (legacy)
     */
    @GetMapping("/json/list/files")
    public Map<String, Object> listFilesFromJson(@RequestParam String jsonPath) {
        try {
            Path path = Paths.get(jsonPath);
            if (!Files.exists(path)) {
                return Map.of("status", "error", "message", "JSON file does not exist: " + jsonPath);
            }
            if (!Files.isRegularFile(path)) {
                return Map.of("status", "error", "message", "Path is not a file: " + jsonPath);
            }

            Type listType = new TypeToken<List<Map<String, Object>>>() {
            }.getType();
            List<Map<String, Object>> data = gson.fromJson(Files.readString(path), listType);
            if (data == null) {
                data = new ArrayList<>();
            }

            return Map.of(
                    "status", "success",
                    "files", data,
                    "total", data.size());
        } catch (Exception e) {
            logger.error("Error listing files from JSON: {}", e.getMessage(), e);
            return Map.of("status", "error", "message", e.getMessage());
        }
    }

    /**
     * GET /management/file/view/details (legacy)
     */
    @GetMapping("/file/view/details")
    public Map<String, Object> fileDetails(@RequestParam int id, @RequestParam String jsonPath,
            @RequestParam(required = false, defaultValue = "") String file) {
        try {
            Type listType = new TypeToken<List<Map<String, Object>>>() {
            }.getType();
            List<Map<String, Object>> data = gson.fromJson(Files.readString(Paths.get(jsonPath)), listType);
            if (data == null) {
                return Map.of("status", "error", "message", "Invalid JSON format");
            }

            for (Map<String, Object> item : data) {
                Object idObj = item.get("id");
                if (idObj == null) {
                    continue;
                }
                int itemId = (idObj instanceof Number)
                        ? ((Number) idObj).intValue()
                        : Integer.parseInt(String.valueOf(idObj));
                if (itemId == id) {
                    return Map.of("status", "success", "file_info", item);
                }
            }

            return Map.of("status", "error", "message", "File not found in the listed data.");
        } catch (Exception e) {
            logger.error("Error getting file details: {}", e.getMessage(), e);
            return Map.of("status", "error", "message", "Error reviewing files: " + e.getMessage());
        }
    }

    /**
     * GET /management/file/view/video (legacy)
     */
    @GetMapping("/file/view/video")
    public ResponseEntity<Resource> viewVideo(@RequestParam int id, @RequestParam String jsonPath) {
        return serveFileFromJson(id, jsonPath, true);
    }

    /**
     * GET /management/file/view/image (legacy)
     */
    @GetMapping("/file/view/image")
    public ResponseEntity<Resource> viewImage(@RequestParam int id, @RequestParam String jsonPath) {
        return serveFileFromJson(id, jsonPath, false);
    }

    private ResponseEntity<Resource> serveFileFromJson(int id, String jsonPath, boolean isVideo) {
        try {
            Type listType = new TypeToken<List<Map<String, Object>>>() {
            }.getType();
            List<Map<String, Object>> data = gson.fromJson(Files.readString(Paths.get(jsonPath)), listType);
            if (data == null) {
                return ResponseEntity.badRequest().build();
            }

            for (Map<String, Object> item : data) {
                Object idObj = item.get("id");
                if (idObj == null) {
                    continue;
                }
                int itemId = (idObj instanceof Number)
                        ? ((Number) idObj).intValue()
                        : Integer.parseInt(String.valueOf(idObj));

                if (itemId == id) {
                    String filePath = String.valueOf(item.getOrDefault("path", ""));
                    Path path = Paths.get(filePath);
                    if (!Files.exists(path)) {
                        return ResponseEntity.notFound().build();
                    }

                    Resource resource = new FileSystemResource(path);
                    MediaType mediaType = resolveMediaType(path, isVideo);

                    return ResponseEntity.ok()
                            .header(HttpHeaders.CONTENT_DISPOSITION,
                                    "inline; filename=\"" + path.getFileName().toString() + "\"")
                            .contentType(mediaType)
                            .body(resource);
                }
            }

            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Error serving file: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    private MediaType resolveMediaType(Path path, boolean isVideo) {
        String fileName = path.getFileName().toString().toLowerCase(Locale.ROOT);
        if (isVideo) {
            if (fileName.endsWith(".mp4")) {
                return MediaType.parseMediaType("video/mp4");
            }
            if (fileName.endsWith(".avi")) {
                return MediaType.parseMediaType("video/x-msvideo");
            }
            if (fileName.endsWith(".mov")) {
                return MediaType.parseMediaType("video/quicktime");
            }
            if (fileName.endsWith(".wmv")) {
                return MediaType.parseMediaType("video/x-ms-wmv");
            }
            if (fileName.endsWith(".flv")) {
                return MediaType.parseMediaType("video/x-flv");
            }
            if (fileName.endsWith(".webm")) {
                return MediaType.parseMediaType("video/webm");
            }
            return MediaType.parseMediaType("video/mp4");
        }

        if (fileName.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }
        if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
            return MediaType.IMAGE_JPEG;
        }
        if (fileName.endsWith(".gif")) {
            return MediaType.IMAGE_GIF;
        }
        if (fileName.endsWith(".bmp")) {
            return MediaType.parseMediaType("image/bmp");
        }
        if (fileName.endsWith(".webp")) {
            return MediaType.parseMediaType("image/webp");
        }
        if (fileName.endsWith(".svg")) {
            return MediaType.parseMediaType("image/svg+xml");
        }
        return MediaType.IMAGE_PNG;
    }

    /**
     * GET /management/video/health
     * Health check endpoint
     */
    @GetMapping("/video/health")
    public Map<String, Object> videoHealth() {
        return Map.of(
                "status", "success",
                "message", "Video management API is running",
                "timestamp", System.currentTimeMillis());
    }

    /**
     * GET /management/video/file/thumbnail
     * Generate (or reuse) thumbnail image for a file entry and return it.
     */
    @GetMapping({ "/video/file/thumbnail", "/file/create/thumbnail" })
    public ResponseEntity<Resource> viewFileThumbnail(
            @RequestParam int id,
            @RequestParam String jsonPath,
            @RequestParam(required = false, defaultValue = "") String relativePath,
            @RequestParam(required = false, defaultValue = "false") boolean forceRegenerate) {
        try {
            Optional<Map<String, Object>> fileInfoOpt = findFileInfoById(id, jsonPath);
            if (fileInfoOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            String filePath = String.valueOf(fileInfoOpt.get().getOrDefault("path", ""));
            if (filePath.isBlank()) {
                return ResponseEntity.badRequest().build();
            }

            Path sourcePath = Paths.get(filePath);
            if (!Files.exists(sourcePath) || !Files.isRegularFile(sourcePath)) {
                return ResponseEntity.notFound().build();
            }

            String fileName = sourcePath.getFileName().toString();
            String extension = "";
            int dot = fileName.lastIndexOf('.');
            if (dot >= 0 && dot < fileName.length() - 1) {
                extension = fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
            }

            Path thumbnailDir = Paths.get(resolveThumbnailBasePath(relativePath));
            Files.createDirectories(thumbnailDir);

            String baseName = (dot > 0) ? fileName.substring(0, dot) : fileName;
            String safeBaseName = baseName.replaceAll("[^a-zA-Z0-9._-]", "_");
            Path thumbnailPath = thumbnailDir.resolve(id + "_" + safeBaseName + ".png");

            boolean needsGeneration = forceRegenerate || !Files.exists(thumbnailPath)
                    || Files.getLastModifiedTime(thumbnailPath).toMillis() < Files.getLastModifiedTime(sourcePath)
                            .toMillis();

            if (needsGeneration) {
                if (!isVideoExtension(extension)) {
                    return ResponseEntity.badRequest().build();
                }

                boolean generated = createVideoThumbnail(sourcePath, thumbnailPath);
                if (!generated) {
                    return ResponseEntity.badRequest().build();
                }
            }

            Resource resource = new FileSystemResource(thumbnailPath);
            if (!resource.exists()) {
                return ResponseEntity.internalServerError().build();
            }

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"" + thumbnailPath.getFileName().toString() + "\"")
                    .contentType(MediaType.IMAGE_PNG)
                    .body(resource);
        } catch (Exception e) {
            logger.error("Error generating thumbnail: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    private Optional<Map<String, Object>> findFileInfoById(int id, String jsonPath) throws IOException {
        Path path = Paths.get(jsonPath);
        if (!Files.exists(path)) {
            return Optional.empty();
        }

        Type listType = new TypeToken<List<Map<String, Object>>>() {
        }.getType();
        List<Map<String, Object>> data = gson.fromJson(Files.readString(path), listType);
        if (data == null) {
            return Optional.empty();
        }

        for (Map<String, Object> item : data) {
            Object idObj = item.get("id");
            if (idObj == null) {
                continue;
            }
            int itemId = (idObj instanceof Number)
                    ? ((Number) idObj).intValue()
                    : Integer.parseInt(String.valueOf(idObj));
            if (itemId == id) {
                return Optional.of(item);
            }
        }

        return Optional.empty();
    }

    private String resolveThumbnailBasePath(String relativePath) throws IOException {
        List<Path> candidates = List.of(
                Paths.get(System.getProperty("user.dir"), "src", "main", "java", "com", "automation",
                        "secrets_data.json"),
                Paths.get(System.getProperty("user.dir"), "secrets_data.json"));

        String configuredPath = "";
        for (Path candidate : candidates) {
            if (Files.exists(candidate)) {
                String content = Files.readString(candidate);
                Map<String, Object> data = gson.fromJson(content, Map.class);
                if (data != null) {
                    Object base = data.get("thumbnail_base_path");
                    if (base == null || String.valueOf(base).isBlank()) {
                        base = data.get("thumbnail_local_path");
                    }
                    if (base != null && !String.valueOf(base).isBlank()) {
                        configuredPath = String.valueOf(base);
                        break;
                    }
                }
            }
        }

        if (configuredPath.isBlank()) {
            configuredPath = Paths.get(System.getProperty("user.dir"), "Thumbnail").toString();
        }

        if (relativePath == null || relativePath.isBlank()) {
            return configuredPath;
        }

        return Paths.get(configuredPath, relativePath).toString();
    }

    private boolean isVideoExtension(String extension) {
        return extension.equals("mp4")
                || extension.equals("avi")
                || extension.equals("mov")
                || extension.equals("mkv")
                || extension.equals("wmv")
                || extension.equals("flv")
                || extension.equals("webm");
    }

    private boolean createVideoThumbnail(Path sourcePath, Path thumbnailPath) {
        try (FFmpegFrameGrabber grabber = new FFmpegFrameGrabber(sourcePath.toFile());
                Java2DFrameConverter converter = new Java2DFrameConverter()) {
            grabber.start();

            long lengthUs = grabber.getLengthInTime();
            long seekUs = Math.min(lengthUs > 0 ? lengthUs / 2 : 0, 180L * 1_000_000L);
            if (seekUs > 0) {
                grabber.setTimestamp(seekUs);
            }

            Frame frame = grabber.grabImage();
            if (frame == null) {
                frame = grabber.grabFrame();
            }
            if (frame == null) {
                return false;
            }

            BufferedImage image = converter.convert(frame);
            if (image == null) {
                return false;
            }

            BufferedImage target = new BufferedImage(320, 180, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = target.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.drawImage(image, 0, 0, 320, 180, null);
            g.dispose();

            javax.imageio.ImageIO.write(target, "png", thumbnailPath.toFile());
            return true;
        } catch (Throwable e) {
            logger.warn("Video thumbnail creation failed for {}: {}", sourcePath, e.getMessage());
            return false;
        }
    }
}
