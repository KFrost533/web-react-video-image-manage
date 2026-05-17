import { apiGet, apiPost } from "./common/_fetch";

/**
 * Get relative path (folder list) based on the provided base path
 * Python endpoint: /folder/get/relativePath
 * 
 * @param {string} basePath - Base directory path to scan for subdirectories
 * @returns {Promise} API response
 * 
 * Success response format:
 * {
 *     "status": "success",
 *     "folders": ["folder1", "folder2", ...], // Array of folder names
 *     "total": 5                               // Total number of folders
 * }
 * 
 * Error response format:
 * {
 *     "status": "error",
 *     "message": "Error description"
 * }
 */
export async function GetRelativePath(basePath) {
    return await apiGet(`/management/folder/get/relativePath?basePath=${encodeURIComponent(basePath)}`);
}

/**
 * Open native folder picker on backend host and return selected base path
 * Python endpoint: /folder/pick/base
 */
export async function PickBaseFolder() {
    return await apiGet(`/management/folder/pick/base`);
}

/**
 * Change the names of several files based on the provided request data
 * Python endpoint: /file/changename/several (POST)
 * 
 * @param {Object} requestData - Request data containing file rename information
 * @param {string[]} requestData.checkedFileIds - Array of file IDs to rename
 * @param {string[]} requestData.checkedFileName - Array of new file names (same order as IDs)
 * @param {string} requestData.jsonPath - Path to JSON file containing file data
 * @returns {Promise} API response
 * 
 * Success response format:
 * {
 *     "status": "success",
 *     "new_file_path": ["path1", "path2", ...] // Array of new file paths after rename
 * }
 * 
 * Error response format:
 * {
 *     "status": "error",
 *     "message": "Error description"
 * }
 */
export async function ChangeNameSeveral(requestData) {
    return await apiPost(`/management/file/changename/several`, requestData);
}

/**
 * Add a tag to a file entry inside the JSON cache.
 * Python endpoint: /file/tag/add (POST)
 *
 * @param {Object} requestData - Request data containing file and tag information
 * @param {number} requestData.fileId - File ID in the JSON data
 * @param {string} requestData.jsonPath - Path to JSON file containing file data
 * @param {string} requestData.tag - Tag to append
 * @returns {Promise} API response
 */
export async function AddTagToFile(requestData) {
    try {
        return await apiPost(`/management/file/tag/add`, requestData);
    } catch (error) {
        // Fallback for environments exposing only the image-scoped route.
        return await apiPost(`/management/image/file/tag/add`, requestData);
    }
}

/**
 * Add tags to multiple files in one request.
 * Python endpoint: /file/tag/batch-add (POST)
 *
 * @param {Object} requestData - Request data containing the JSON path and batched updates
 * @param {string} requestData.jsonPath - Path to JSON file containing file data
 * @param {{fileId: number, tags: string[]}[]} requestData.updates - Batched file tag updates
 * @returns {Promise} API response
 */
export async function BatchAddTagsToFiles(requestData) {
    try {
        return await apiPost(`/management/file/tag/batch-add`, requestData);
    } catch (error) {
        // Fallback for environments exposing only the image-scoped route.
        return await apiPost(`/management/image/file/tag/batch-add`, requestData);
    }
}

/**
 * Check if a JSON file exists for the given folder path
 * Python endpoint: /folder/check/json
 * 
 * @param {string} folderPath - Folder path to check for existing JSON file (optional parameter)
 * @returns {Promise} API response
 * 
 * Success response format:
 * {
 *     "status": "success",
 *     "exists": true/false,         // Whether JSON file exists
 *     "json_path": "path/to/file"   // Path to JSON file (empty string if not exists)
 * }
 * 
 * Error response format:
 * {
 *     "status": "error",
 *     "message": "Error description",
 *     "exists": false
 * }
 */
export async function CheckExistingJson(folderPath) {
    return await apiGet(`/management/folder/check/json?folderPath=${encodeURIComponent(folderPath)}`);
}

/**
 * List JSON data based on the existing check information
 * Python endpoint: /json/list/files
 * 
 * @param {Object} existingCheck - Object containing JSON file path information
 * @param {string} existingCheck.json_path - Path to JSON file to read
 * @returns {Promise} API response
 * 
 * Success response format:
 * {
 *     "status": "success",
 *     "files": [                    // Array of file objects
 *         {
 *             "id": 1,              // Unique file ID
 *             "name": "file.mp4",   // File name
 *             "path": "C:/path/to/file.mp4", // Full file path
 *             "size": 12345,        // File size in bytes
 *             "extension": ".mp4",  // File extension
 *             "created_time": "2023-10-01 12:00:00", // Creation timestamp
 *             "tags": []            // Array of tags (if any)
 *         },
 *         ...
 *     ],
 *     "total": 100                  // Total number of files
 * }
 * 
 * Error response format:
 * {
 *     "status": "error",
 *     "message": "Error description"
 * }
 */
export async function ListJsonData(existingCheck) {
    return await apiGet(`/management/json/list/files?jsonPath=${encodeURIComponent(existingCheck.json_path)}`);
}

/**
 * View files in the specified folder path
 * Python endpoint: /folder/view/files
 * Executes folder_listup() function to scan folder and create/update JSON file
 * 
 * @param {string} folderPath - Folder path to scan for files
 * @returns {Promise} API response
 * 
 * Success response format:
 * {
 *     "status": "success",
 *     "json_path": "path/to/generated/file_list.json", // Path to created/updated JSON
 *     "files": [                    // Array of file objects (same structure as ListJsonData)
 *         {
 *             "id": 1,
 *             "name": "file.mp4",
 *             "path": "C:/path/to/file.mp4",
 *             "size": 12345,
 *             "extension": ".mp4",
 *             "created_time": "2023-10-01 12:00:00",
 *             "tags": []
 *         },
 *         ...
 *     ]
 * }
 * 
 * Error response format:
 * {
 *     "status": "error",
 *     "json_path": "",
 *     "message": "Error description"
 * }
 */
export async function ViewFiles(folderPath) {
    return await apiGet(`/management/folder/view/files?folderPath=${encodeURIComponent(folderPath)}`);
}

/**
 * Create a graph to visualize folder data (numbers of files, sizes, etc.)
 * Python endpoint: /folder/create/graph
 * Executes folder_graph_create() function to generate a PNG graph
 * 
 * @param {string} folderPath - Folder path to analyze for graph creation
 * @returns {Promise} API response (returns PNG file or error)
 * 
 * Success response: Returns PNG file as FileResponse
 * 
 * Error response format:
 * {
 *     "status": "error",
 *     "message": "Error description"
 * }
 */
export async function CreateFolderGraph(folderPath) {
    return await apiGet(`/management/folder/create/graph?folderPath=${encodeURIComponent(folderPath)}`);
}

/**
 * Change the name of a single file
 * Python endpoint: /file/changename/single (POST)
 * 
 * @param {Object} requestData - Request data containing file rename information
 * @param {string} requestData.oldPath - Current file path
 * @param {string} requestData.newPath - New file path
 * @returns {Promise} API response
 * 
 * Success response format:
 * {
 *     "status": "success",
 *     "new_file_path": "path/to/renamed/file.ext"
 * }
 * 
 * Error response format:
 * {
 *     "status": "error",
 *     "message": "Error description"
 * }
 */
export async function ChangeNameSingle(requestData) {
    return await apiPost(`/management/file/changename/single`, requestData);
}

/**
 * Get detailed information about a specific file
 * Python endpoint: /file/view/details
 * 
 * @param {number} id - File ID from JSON data
 * @param {string} jsonPath - Path to JSON file containing file data
 * @param {string} file - Optional file parameter
 * @returns {Promise} API response
 * 
 * Success response format:
 * {
 *     "status": "success",
 *     "file_info": {
 *         "id": 1,
 *         "name": "file.mp4",
 *         "path": "C:/path/to/file.mp4",
 *         "size": 12345,
 *         "extension": ".mp4",
 *         "created_time": "2023-10-01 12:00:00",
 *         "tags": []
 *     }
 * }
 * 
 * Error response format:
 * {
 *     "status": "error",
 *     "message": "Error description"
 * }
 */
export async function GetFileDetails(id, jsonPath, file = "") {
    return await apiGet(`/management/file/view/details?id=${id}&jsonPath=${encodeURIComponent(jsonPath)}&file=${encodeURIComponent(file)}`);
}

/**
 * Get existing thumbnail for a file from folder (before creating new one)
 * Python endpoint: /file/view/thumbnail/exists
 * Searches for existing thumbnail files to improve performance
 * 
 * @param {string} id - File ID as string
 * @param {string} jsonPath - Path to JSON file containing file data
 * @returns {Promise} API response (returns image file or 404 error)
 * 
 * Success response: Returns image file as FileResponse
 * 
 * Error response: HTTP 404 if no existing thumbnail found
 * Error response: HTTP 500 for other errors
 */
export async function GetExistingThumbnail(id, jsonPath) {
    return await apiGet(`/management/file/view/thumbnail/exists?id=${encodeURIComponent(id)}&jsonPath=${encodeURIComponent(jsonPath)}`);
}

/**
 * Serve video files for playback
 * Python endpoint: /file/view/video
 * 
 * @param {number} id - File ID from JSON data
 * @param {string} jsonPath - Path to JSON file containing file data
 * @returns {Promise} API response (returns video file or error)
 * 
 * Success response: Returns video file as FileResponse with appropriate media type
 * Supported formats: .mp4, .avi, .mov, .wmv, .flv, .webm
 * 
 * Error response format:
 * {
 *     "error": "Error description"
 * }
 */
export async function ServeVideoFile(id, jsonPath) {
    return await apiGet(`/management/file/view/video?id=${id}&jsonPath=${encodeURIComponent(jsonPath)}`);
}

/**
 * Serve image files for display
 * Python endpoint: /file/view/image
 * 
 * @param {number} id - File ID from JSON data
 * @param {string} jsonPath - Path to JSON file containing file data
 * @returns {Promise} API response (returns image file or error)
 * 
 * Success response: Returns image file as FileResponse with appropriate media type
 * Supported formats: .png, .jpg, .jpeg, .gif, .bmp, .webp, .svg
 * 
 * Error response format:
 * {
 *     "error": "Error description"
 * }
 */
export async function ServeImageFile(id, jsonPath) {
    return await apiGet(`/management/file/view/image?id=${id}&jsonPath=${encodeURIComponent(jsonPath)}`);
}

/**
 * Create thumbnail for a file
 * Python endpoint: /file/create/thumbnail
 * Executes file_thumbnail_create() function to generate thumbnail
 * 
 * @param {number} id - File ID from JSON data
 * @param {string} jsonPath - Path to JSON file containing file data
 * @param {string} relativePath - Optional relative path parameter
 * @returns {Promise} API response (returns thumbnail PNG file or error)
 * 
 * Success response: Returns PNG thumbnail file as FileResponse
 * 
 * Error response format:
 * {
 *     "status": "error",
 *     "message": "Error description"
 * }
 */
export async function CreateThumbnail(id, jsonPath, relativePath = "") {
    return await apiGet(`/management/file/create/thumbnail?id=${id}&jsonPath=${encodeURIComponent(jsonPath)}&relativePath=${encodeURIComponent(relativePath)}`);
}

/**
 * Serve thumbnail image files
 * Python endpoint: /file/view/thumbnail
 * 
 * @param {string} path - Path to thumbnail file
 * @returns {Promise} API response (returns thumbnail file or error)
 * 
 * Success response: Returns thumbnail PNG file as FileResponse
 * 
 * Error response format:
 * {
 *     "error": "Error description"
 * }
 */
export async function ServeThumbnailFile(path) {
    return await apiGet(`/management/file/view/thumbnail?path=${encodeURIComponent(path)}`);
}