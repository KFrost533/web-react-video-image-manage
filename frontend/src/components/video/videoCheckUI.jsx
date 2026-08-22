import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PickBaseFolder } from '../../api/imageManagementApi';

function VideoCheckPage() {
    const navigate = useNavigate();

    // States for folder path to list up and file name change
    const [basePath, setBasePath] = useState(() => {
        return localStorage.getItem('folderManagement_basePath') || "";
    });
    const [relativePath, setRelativePath] = useState(() => {
        return localStorage.getItem('folderManagement_relativePath') || "";
    });
    const [folderPath, setFolderPath] = useState(() => {
        return localStorage.getItem('folderManagement_folderPath') || "";
    });

    // all folder data - restore from localStorage if available
    const [folderData, setFolderData] = useState(() => {
        const cached = localStorage.getItem('folderManagement_folderData');
        return cached ? JSON.parse(cached) : [];
    });

    // all files data (complete dataset) - restore from localStorage if available
    const [allFilesData, setAllFilesData] = useState(() => {
        const cached = localStorage.getItem('folderManagement_allFilesData');
        return cached ? JSON.parse(cached) : null;
    });

    // folder graph data - restore from localStorage if available
    const [folderGraphData, setFolderGraphData] = useState(() => {
        const cached = localStorage.getItem('folderManagement_folderGraphData');
        return cached ? JSON.parse(cached) : [];
    });

    // JSON path for passing to file details page - restore from localStorage
    const [fileJsonPath, setFileJsonPath] = useState(() => {
        return localStorage.getItem('folderManagement_fileJsonPath') || null;
    });

    const [fileDataGet, setFileDataGet] = useState(false);
    const [thumbnailList, setThumbnailList] = useState({});
    const [thumbnailLoadingState, setThumbnailLoadingState] = useState({}); // Track loading state per file

    // thumbnail cache state - restore from localStorage with Base64 data
    const [thumbnailCache, setThumbnailCache] = useState(() => {
        try {
            const cached = localStorage.getItem('folderManagement_thumbnailCache');
            return cached ? JSON.parse(cached) : {};
        } catch (error) {
            console.warn('Failed to restore thumbnail cache:', error);
            return {};
        }
    });

    // Restore thumbnails from cache on component mount
    useEffect(() => {
        const restoreThumbnailsFromCache = () => {
            const cacheKeys = Object.keys(thumbnailCache);
            if (cacheKeys.length > 0) {
                console.log(`Restoring ${cacheKeys.length} thumbnails from cache`);
                const restoredThumbnails = {};
                
                cacheKeys.forEach(fileId => {
                    try {
                        const base64Data = thumbnailCache[fileId];
                        if (base64Data) {
                            const byteCharacters = atob(base64Data);
                            const byteNumbers = new Array(byteCharacters.length);
                            for (let i = 0; i < byteCharacters.length; i++) {
                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                            }
                            const byteArray = new Uint8Array(byteNumbers);
                            const blob = new Blob([byteArray], { type: 'image/jpeg' });
                            const blobUrl = URL.createObjectURL(blob);
                            restoredThumbnails[fileId] = blobUrl;
                        }
                    } catch (error) {
                        console.warn(`Failed to restore cached thumbnail for ${fileId}:`, error);
                        // Remove invalid cache entry
                        setThumbnailCache(prev => {
                            const updated = { ...prev };
                            delete updated[fileId];
                            return updated;
                        });
                    }
                });
                
                if (Object.keys(restoredThumbnails).length > 0) {
                    setThumbnailList(restoredThumbnails);
                    console.log(`Successfully restored ${Object.keys(restoredThumbnails).length} thumbnails`);
                }
            }
        };
        
        // Restore thumbnails on mount if cache exists
        restoreThumbnailsFromCache();
        
        // Debug log current state
        console.log('Component mounted - Current state:', {
            thumbnailCacheKeys: Object.keys(thumbnailCache),
            thumbnailListKeys: Object.keys(thumbnailList)
        });
    }, [thumbnailCache]); // Run when thumbnailCache is initialized

    const [useExistingData, setUseExistingData] = useState(true); // Control whether to use existing JSON files
    const [jsonFileCache, setJsonFileCache] = useState({}); // Cache for existing JSON file paths
    const [shouldLoadThumbnails, setShouldLoadThumbnails] = useState(false); // Control thumbnail loading independently

    // Pagination states
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filteredData, setFilteredData] = useState(null);
    const [itemsPerPage, setItemsPerPage] = useState(() => {
        const cached = Number(localStorage.getItem('folderManagement_itemsPerPage'));
        return Number.isFinite(cached) && cached > 0 ? cached : 50;
    });

    // Error state
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handlePickBasePath = async () => {
        try {
            const picked = await PickBaseFolder();
            if (picked.status === 'success' && picked.base_path) {
                setBasePath(picked.base_path);
                setRelativePath('');
                setFolderPath('');
                setError(null);
            } else if (picked.status === 'error') {
                setError(picked.message || 'Failed to pick base folder.');
            }
        } catch (e) {
            setError(`Failed to open folder picker: ${e.message}`);
        }
    };

    // Save states to localStorage whenever they change
    useEffect(() => {
        if (basePath) localStorage.setItem('folderManagement_basePath', basePath);
    }, [basePath]);

    useEffect(() => {
        if (relativePath) {
            localStorage.setItem('folderManagement_relativePath', relativePath);
        } else {
            localStorage.removeItem('folderManagement_relativePath');
        }
    }, [relativePath]);

    useEffect(() => {
        if (folderPath) localStorage.setItem('folderManagement_folderPath', folderPath);
    }, [folderPath]);

    useEffect(() => {
        if (folderData) {
            localStorage.setItem('folderManagement_folderData', JSON.stringify(folderData));
        }
    }, [folderData]);

    useEffect(() => {
        if (allFilesData) {
            localStorage.setItem('folderManagement_allFilesData', JSON.stringify(allFilesData));
        }
    }, [allFilesData]);

    useEffect(() => {
        if (allFilesData) {
            localStorage.setItem('folderManagement_allFilesData', JSON.stringify(allFilesData));
        }
    }, [allFilesData]);

    useEffect(() => {
        if (allFilesData) {
            localStorage.setItem('folderManagement_allFilesData', JSON.stringify(allFilesData));
        }
    }, [allFilesData]);

    useEffect(() => {
        if (folderGraphData) {
            localStorage.setItem('folderManagement_folderGraphData', JSON.stringify(folderGraphData));
        }
    }, [folderGraphData]);

    useEffect(() => {
        if (fileJsonPath) {
            localStorage.setItem('folderManagement_fileJsonPath', fileJsonPath);
        }
    }, [fileJsonPath]);

    useEffect(() => {
        localStorage.setItem('folderManagement_itemsPerPage', String(itemsPerPage));
    }, [itemsPerPage]);

    // Debug useEffect to monitor thumbnailList changes
    useEffect(() => {
        console.log(`🔍 thumbnailList updated:`, {
            count: Object.keys(thumbnailList).length,
            keys: Object.keys(thumbnailList),
            entries: Object.entries(thumbnailList).map(([key, value]) => ({ key, hasUrl: !!value }))
        });
    }, [thumbnailList]);

    // Save thumbnail cache to localStorage with size management
    useEffect(() => {
        try {
            // Limit cache size to prevent quota exceeded errors
            const maxCacheSize = 50; // Maximum number of cached thumbnails
            const cacheKeys = Object.keys(thumbnailCache);
            
            if (cacheKeys.length > maxCacheSize) {
                console.log(`Cache size (${cacheKeys.length}) exceeds limit (${maxCacheSize}), cleaning up...`);
                
                // Keep only the most recent entries (simple approach)
                const sortedKeys = cacheKeys.sort((a, b) => b - a); // Sort by fileId (assuming higher ids are newer)
                const keysToKeep = sortedKeys.slice(0, maxCacheSize);
                
                const cleanedCache = {};
                keysToKeep.forEach(key => {
                    cleanedCache[key] = thumbnailCache[key];
                });
                
                setThumbnailCache(cleanedCache);
                localStorage.setItem('folderManagement_thumbnailCache', JSON.stringify(cleanedCache));
                console.log(`Cache cleaned: kept ${keysToKeep.length} entries`);
            } else {
                localStorage.setItem('folderManagement_thumbnailCache', JSON.stringify(thumbnailCache));
            }
        } catch (error) {
            console.warn('Failed to save thumbnail cache:', error);
            // If storage is still full, clear all cache
            if (error.name === 'QuotaExceededError') {
                console.log('Storage quota exceeded, clearing all thumbnail cache');
                localStorage.removeItem('folderManagement_thumbnailCache');
                setThumbnailCache({});
                
                // Also clear other large localStorage items if needed
                try {
                    const usage = JSON.stringify(thumbnailCache).length;
                    console.log(`Attempted cache size: ${(usage / 1024 / 1024).toFixed(2)} MB`);
                } catch (e) {
                    console.log('Could not calculate cache size');
                }
            }
        }
    }, [thumbnailCache]);

    // thumbnail loading function
    const loadThumbnailsForFiles = async (files, jsonPath) => {
        if (!files || !Array.isArray(files) || !jsonPath) {
            console.warn('Invalid parameters for thumbnail loading:', { files: files?.length, jsonPath });
            return;
        }

        console.log(`🖼️  Loading thumbnails for ${files?.length || 0} files (Page ${page || 'unknown'}) using JSON: ${jsonPath}`);
        console.log(`Current thumbnailList has ${Object.keys(thumbnailList).length} entries`);
        console.log(`Current thumbnailCache has ${Object.keys(thumbnailCache).length} entries`);
        
        const fileIds = files.map(file => file.id);
        
        const initialLoadingState = {};
        const filesToLoad = [];
        
        fileIds.forEach(fileId => {
            // Check if thumbnail is already loaded or cached
            if (thumbnailList[fileId] || thumbnailCache[fileId]) {
                // Already loaded or cached, no need to load
                initialLoadingState[fileId] = false;
                console.log(`📋 File ${fileId}: already available (${thumbnailList[fileId] ? 'loaded' : 'cached'})`);
            } else {
                // Need to load
                initialLoadingState[fileId] = true;
                filesToLoad.push(fileId);
                console.log(`🔄 File ${fileId}: needs loading`);
            }
        });
        
        setThumbnailLoadingState(initialLoadingState);
        
        console.log(`📊 Loading ${filesToLoad?.length || 0} new thumbnails, ${fileIds.length - filesToLoad.length} already available`);

        const loadThumbnail = async (fileId, retryCount = 0) => {
            const maxRetries = 3;
            const baseDelay = 1000; // 1 second base delay
            
            console.log(`🔍 Starting thumbnail load for file ${fileId} (attempt ${retryCount + 1}/${maxRetries + 1})`);
            
            try {
                const url = `http://localhost:5000/management/file/create/thumbnail?id=${fileId}&jsonPath=${encodeURIComponent(jsonPath)}&relativePath=${encodeURIComponent(relativePath || '')}`;
                console.log(`📡 Fetching from: ${url}`);
                
                const response = await fetch(url, { 
                    cache: 'no-cache',  // Changed to no-cache for retry attempts
                    signal: AbortSignal.timeout(10000) // 10 second timeout
                });
                console.log(`📨 Response for file ${fileId}:`, { status: response.status, ok: response.ok });
                
                if (response.ok) {
                    const contentType = response.headers.get('content-type') || '';
                    if (!contentType.startsWith('image/')) {
                        throw new Error(`Non-image response: ${contentType || 'unknown content-type'}`);
                    }

                    const thumbnail_blob = await response.blob();
                    if (thumbnail_blob && thumbnail_blob.size > 0) {
                        const thumbnail_url = URL.createObjectURL(thumbnail_blob);
                        setThumbnailList(prev => {
                            const updated = { ...prev, [fileId]: thumbnail_url };
                            console.log(`🎯 Updated thumbnailList for file ${fileId}:`, {
                                fileId,
                                url: thumbnail_url,
                                totalThumbnails: Object.keys(updated).length,
                                allKeys: Object.keys(updated),
                                attempt: retryCount + 1
                            });
                            return updated;
                        });
                        console.log(`Fetched and cached thumbnail for file ${fileId}`);
                        // Convert blob to compressed Base64 for caching
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            try {
                                // Create a smaller, compressed version for caching
                                const img = new Image();
                                img.onload = () => {
                                    const canvas = document.createElement('canvas');
                                    const ctx = canvas.getContext('2d');
                                    
                                    // Use smaller dimensions for cache (reduce size significantly)
                                    const maxSize = 150; // Smaller than display size (450x270)
                                    const aspectRatio = img.width / img.height;
                                    
                                    if (aspectRatio > 1) {
                                        canvas.width = maxSize;
                                        canvas.height = maxSize / aspectRatio;
                                    } else {
                                        canvas.width = maxSize * aspectRatio;
                                        canvas.height = maxSize;
                                    }
                                    
                                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                                    
                                    // Convert to compressed JPEG with lower quality
                                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6); // 60% quality
                                    const compressedBase64 = compressedDataUrl.split(',')[1];
                                    
                                    // Check compressed size before caching
                                    const sizeKB = (compressedBase64.length * 0.75) / 1024; // Rough Base64 size calculation
                                    console.log(`Compressed thumbnail size: ${sizeKB.toFixed(1)}KB for file ${fileId}`);
                                    
                                    if (sizeKB < 100) { // Only cache if smaller than 100KB
                                        setThumbnailCache(prev => ({ ...prev, [fileId]: compressedBase64 }));
                                    } else {
                                        console.log(`Skipping cache for file ${fileId}: too large (${sizeKB.toFixed(1)}KB)`);
                                    }
                                };
                                img.src = reader.result;
                            } catch (error) {
                                console.warn(`Failed to compress thumbnail for caching:`, error);
                                // Fallback to original method
                                const base64data = reader.result.split(',')[1];
                                setThumbnailCache(prev => ({ ...prev, [fileId]: base64data }));
                            }
                        };
                        reader.readAsDataURL(thumbnail_blob);
                        
                        console.log(`✅ Thumbnail loaded and cached for file ${fileId} on attempt ${retryCount + 1}`);
                        return; // Success, exit the function
                    } else {
                        console.warn(`⚠️  Empty thumbnail blob for file ${fileId} on attempt ${retryCount + 1}`);
                        // Treat empty blob as retriable error
                        throw new Error('Empty thumbnail blob');
                    }
                } else if (response.status === 404) {
                    console.warn(`❌ Thumbnail not found for file ${fileId} (404) - not retrying`);
                    return; // Don't retry on 404
                } else {
                    console.error(`❌ Thumbnail error for file ${fileId}: HTTP ${response.status} on attempt ${retryCount + 1}`);
                    // Treat HTTP errors as retriable
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (error) {
                const shouldRetry = retryCount < maxRetries && 
                    (error.name === 'TimeoutError' || 
                     error.name === 'TypeError' || 
                     error.message.includes('HTTP') ||
                     error.message.includes('Empty thumbnail blob') ||
                     error.message.includes('fetch'));
                
                console.error(`💥 Failed to load thumbnail for file ${fileId} (attempt ${retryCount + 1}):`, error.message);
                
                if (shouldRetry) {
                    const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
                    console.log(`🔄 Retrying file ${fileId} in ${delay}ms (attempt ${retryCount + 2}/${maxRetries + 1})`);
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return loadThumbnail(fileId, retryCount + 1); // Recursive retry
                } else {
                    console.error(`🚫 Max retries reached for file ${fileId}, giving up`);
                }
            } finally {
                // Only set loading to false on final attempt (success or max retries reached)
                if (retryCount >= maxRetries || arguments[1] === undefined) {
                    console.log(`🏁 Finished loading attempts for file ${fileId}`);
                    setThumbnailLoadingState(prev => ({ ...prev, [fileId]: false }));
                }
            }
        };

        // Load thumbnails in batches with retry support
        const chunkSize = 3;
        
        console.log(`📦 Processing ${filesToLoad?.length || 0} thumbnails in batches, ${fileIds.length - filesToLoad.length} already available`);
        
        for (let i = 0; i < (filesToLoad?.length || 0); i += chunkSize) {
            const chunk = filesToLoad.slice(i, i + chunkSize);
            console.log(`🚀 Loading batch ${Math.floor(i/chunkSize) + 1}: files ${chunk.join(', ')}`);
            
            await Promise.allSettled(chunk.map(fileId => loadThumbnail(fileId)));
            
            if (i + chunkSize < (filesToLoad?.length || 0)) {
                await new Promise(resolve => setTimeout(resolve, 300)); // Slightly longer pause between batches
            }
        }
        
        console.log(`🎊 Thumbnail loading process completed for all files`);
    };

    // useEffect for thumbnail loading and restoration
    useEffect(() => {
        // Always try to load thumbnails when folderData changes
        if (folderData && folderData.length > 0 && fileJsonPath) {
            console.log(`Auto-triggering thumbnail loading for ${folderData.length} files on page ${page}`);
            loadThumbnailsForFiles(folderData, fileJsonPath);
        }
        
        // Also handle explicit shouldLoadThumbnails trigger
        if (shouldLoadThumbnails && folderData && fileJsonPath) {
            console.log(`Manual trigger: loading thumbnails for ${folderData?.length || 0} files on page ${page}`);
            loadThumbnailsForFiles(folderData, fileJsonPath);
            setShouldLoadThumbnails(false);
        }
        
        // Also restore cached thumbnails for current folderData
        if (folderData && folderData.length > 0) {
            const currentFileIds = folderData.map(file => file.id);
            const restoredThumbnails = {};
            let hasRestoredAny = false;
            
            currentFileIds.forEach(fileId => {
                // Only restore if not already in thumbnailList and exists in cache
                if (!thumbnailList[fileId] && thumbnailCache[fileId]) {
                    try {
                        const base64Data = thumbnailCache[fileId];
                        if (base64Data) {
                            const byteCharacters = atob(base64Data);
                            const byteNumbers = new Array(byteCharacters.length);
                            for (let i = 0; i < byteCharacters.length; i++) {
                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                            }
                            const byteArray = new Uint8Array(byteNumbers);
                            const blob = new Blob([byteArray], { type: 'image/jpeg' });
                            const blobUrl = URL.createObjectURL(blob);
                            restoredThumbnails[fileId] = blobUrl;
                            hasRestoredAny = true;
                        }
                    } catch (error) {
                        console.warn(`Failed to restore cached thumbnail for ${fileId}:`, error);
                    }
                }
            });
            
            if (hasRestoredAny) {
                setThumbnailList(prev => {
                    const updated = { ...prev, ...restoredThumbnails };
                    console.log(`🎯 Restored thumbnails from cache:`, {
                        restoredCount: Object.keys(restoredThumbnails).length,
                        restoredIds: Object.keys(restoredThumbnails),
                        totalThumbnails: Object.keys(updated).length
                    });
                    return updated;
                });
                console.log(`Restored ${Object.keys(restoredThumbnails).length} cached thumbnails for current page`);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [folderData, fileJsonPath, page, shouldLoadThumbnails]);



    const [allDirs, setAllDirs] = useState(() => {
        const cached = localStorage.getItem('folderManagement_allDirs');
        return cached ? JSON.parse(cached) : [];
    });

    // Save allDirs to localStorage when it changes
    useEffect(() => {
        if (allDirs && (allDirs?.length || 0) > 0) {
            localStorage.setItem('folderManagement_allDirs', JSON.stringify(allDirs));
        }
    }, [allDirs]);

    // Handler for folder selection from dropdown
    const handleFolderSelect = (selectedFolder) => {
        console.log('Selected folder:', selectedFolder);
        setRelativePath(selectedFolder);
    };
    
    // Auto-fetch folders when basePath changes
    useEffect(() => {
        if (basePath && basePath.trim() !== '') {
            console.log('Auto-fetching folders for basePath:', basePath);
            fetch(`http://localhost:5000/management/folder/get/relativePath?basePath=${encodeURIComponent(basePath)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.status === "success") {
                        console.log('Available folders:', data.folders);
                        setAllDirs(data.folders);
                        setError(null);
                    } else {
                        console.warn(`Error fetching folders: ${data.message}`);
                        setAllDirs([]);
                        setError(`Folder error: ${data.message}`);
                    }
                })
                .catch(err => {
                    console.error("Error fetching folders:", err);
                    setAllDirs([]);
                    setError(`Cannot reach backend: ${err.message}`);
                });
        } else if (basePath === '') {
            // Only clear when basePath is explicitly cleared
            setAllDirs([]);
            setRelativePath('');
            localStorage.removeItem('folderManagement_allDirs');
        }
    }, [basePath]);

    // set folderPath when basePath or relativePath changes
    // relativePath is optional – if absent, use basePath directly
    useEffect(() => { 
        if (basePath) { 
            const resolved = relativePath
                ? basePath + "\\" + relativePath
                : basePath;
            setFolderPath(resolved);
            console.log("Set folderPath to:", resolved);
        } 
    }, [basePath, relativePath]);

    // Rename check state
    const [checkedFiles, setCheckedFiles] = useState({});

    useEffect(() => {
        const sourceData = (filteredData && Array.isArray(filteredData)) ? filteredData : allFilesData;

        // Only process pagination if we have source data
        if (!sourceData || !Array.isArray(sourceData) || sourceData.length === 0) {
            console.warn('No sourceData available for pagination');
            // Set empty folder data instead of returning early
            setFolderData([]);
            setTotalPages(1);
            return;
        }

        // Calculate pagination
        const perPage = itemsPerPage;
        const startIndex = (page - 1) * perPage;
        const endIndex = startIndex + perPage;
        const pageData = sourceData.slice(startIndex, endIndex);
        const totalPages = Math.max(1, Math.ceil(sourceData.length / perPage));

        if (page > totalPages) {
            setPage(1);
            return;
        }

        console.log(`Displaying page ${page}: items ${startIndex + 1}-${Math.min(endIndex, sourceData.length)} of ${sourceData.length} (perPage: ${perPage})`);
        
        // Update folder data with current page
        setFolderData(pageData);
        setTotalPages(totalPages);
        
        // Clear previous page thumbnails and loading states
        setThumbnailLoadingState({});
        
        // Trigger thumbnail loading for new page data
        setShouldLoadThumbnails(true);
        
    }, [page, allFilesData, filteredData, itemsPerPage]);

    // handler for checkbox change
    const handleCheck = (fileId, checked) => {
        if (checked) {
            // Find the file to get its name
            const file = folderData.find(f => f.id === fileId);
            const fileName = file ? file.name : '';
             setCheckedFiles(prev => ({
               ...prev,
                [fileId]: fileName
            }));
        } else {
            setCheckedFiles(prev => {
                const updated = { ...prev };
                delete updated[fileId];
                return updated;
            });
        }
    };

    // to add all ids to checkedFiles when renameCheck is true
    const renameInputChange = (fileId, newName) => {
        setCheckedFiles(prev => ({
            ...prev,
            [fileId]: newName
        }));
    };

    const [renameCheck, setRenameCheck] = useState(false);

    // rename execute function
    const renameExecute = async () => {
        console.log("checkedFiles raw:", checkedFiles);
        console.log("fileJsonPath:", fileJsonPath);

        if (!fileJsonPath) {
            setError("JSON path is not available. Please reload the folder data.");
            return;
        }

        // Validate data before sending
        const fileIds = Object.keys(checkedFiles);
        const fileNames = Object.values(checkedFiles);
        
        const requestData = {
            checkedFileIds: fileIds,
            checkedFileName: fileNames,
            jsonPath: fileJsonPath
        };

        try {
            const res_rename = await fetch("http://localhost:5000/management/file/changename/several", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestData),
            });
            
            if (!res_rename.ok) {
                const errorText = await res_rename.text();
                console.error("Server error response:", errorText);
                setError(`Server error (${res_rename.status}): ${errorText}`);
                return;
            }
            
            const renameResults = await res_rename.json();
            
            if (renameResults.status === "success") {
                console.log("======================");
                console.log("Rename success");
                console.log({checkedFiles});
                console.log("======================");
            
                setCheckedFiles({});
                setShouldLoadThumbnails(true);
                setRenameCheck(true);
            } else {
                setError(`Rename failed: ${renameResults.message}`);
            }
            setError(null);
        } catch (error) {
            console.error("Error renaming files:", error);
            setError(`Error renaming files: ${error.message}`);
        }
    };
    
    const checkExistingJsonFile = async () => {
        const res_check = await fetch(
            `http://localhost:5000/management/folder/check/json?folderPath=${encodeURIComponent(folderPath)}`
        );
        if (!res_check.ok) {
            console.error('Error checking existing JSON file:', res_check.status, res_check.statusText);
        }
        const data_check = await res_check.json();
        console.log('Existing JSON file check result:', data_check);            
        return data_check; // { exists: bool, json_path: string|null, source: 'server'|'local'|null }
    };

    // function to create folder graph
    const createFolderGraph = async () => {
        // Fetch folder graph data
        console.log("Fetching folder graph data...");
        const res = await fetch(
            `http://localhost:5000/management/folder/create/graph?folderPath=${encodeURIComponent(folderPath)}`
        );
        if (!res.ok) {
            console.log("Graph fetch failed:", res.status, res.statusText);
            setError(`Graph Error: ${res.status} ${res.statusText}`);
            // Continue without graph instead of returning
            setFolderGraphData(null);
        } else {
            const graphBlob = await res.blob();
            const graphUrl = URL.createObjectURL(graphBlob);
            console.log("Graph URL:", graphUrl);
            setFolderGraphData({ graphUrl });
        }
        setIsLoading(false);
        setError(null); // Clear previous errors
        setPage(1); // Reset to first page

        // Trigger independent thumbnail loading
        setShouldLoadThumbnails(true);
    };

    // Tags list state - restore from localStorage
    const [tagsList, setTagsList] = useState(() => {
        try {
            const cached = localStorage.getItem('folderManagement_tagsList');
            return cached ? JSON.parse(cached) : [];
        } catch (error) {
            console.warn('Failed to restore tagsList from localStorage:', error);
            return [];
        }
    });

    // Filter states
    const [extensionFilter, setExtensionFilter] = useState('all');
    const [sizeFilter, setSizeFilter] = useState('all');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [selectedTag, setSelectedTag] = useState('');

    // Save tagsList to localStorage when it changes
    useEffect(() => {
        if (tagsList && (tagsList?.length || 0) > 0) {
            localStorage.setItem('folderManagement_tagsList', JSON.stringify(tagsList));
        }
    }, [tagsList]);


    // Enhanced filtering function
    const applyFilters = () => {
        if (!allFilesData || !Array.isArray(allFilesData)) return;
        
        let filtered = [...allFilesData];
        
        // Extension filter
        if (extensionFilter && extensionFilter !== 'all') {
            filtered = filtered.filter(file => 
                file.extension && file.extension.toLowerCase() === extensionFilter.toLowerCase()
            );
        }
        
        // Size filter
        if (sizeFilter && sizeFilter !== 'all') {
            filtered = filtered.filter(file => {
                const sizeInMB = file.size / (1024 * 1024);
                switch(sizeFilter) {
                    case 'small': return sizeInMB < 100;
                    case 'medium': return sizeInMB >= 100 && sizeInMB < 500;
                    case 'large': return sizeInMB >= 500 && sizeInMB < 1000;
                    case 'xlarge': return sizeInMB >= 1000;
                    default: return true;
                }
            });
        }
        
        // Search keyword filter
        if (searchKeyword && searchKeyword.trim()) {
            const keyword = searchKeyword.toLowerCase().trim();
            filtered = filtered.filter(file => 
                file.name && file.name.toLowerCase().includes(keyword)
            );
        }
        
        // Tag filter
        if (selectedTag && selectedTag !== '') {
            filtered = filtered.filter(file => 
                file.tags && Array.isArray(file.tags) && file.tags.includes(selectedTag)
            );
        }
        
        setFilteredData(filtered);
        setFolderData(filtered.slice(0, itemsPerPage));
        setTotalPages(Math.max(1, Math.ceil(filtered.length / itemsPerPage)));
        setPage(1);
        setShouldLoadThumbnails(true);
    };
    
    // Clear all filters
    const clearAllFilters = () => {
        setExtensionFilter('all');
        setSizeFilter('all');
        setSearchKeyword('');
        setSelectedTag('');
        setFilteredData(null);
        setPage(1);
    };
    
    // Apply filters when filter states change
    useEffect(() => {
        applyFilters();
    }, [extensionFilter, sizeFilter, searchKeyword, selectedTag, allFilesData, itemsPerPage]);

    // tag filter function based on tags array in each file data
    const tagsFilter = async (tag) => {
        if (!allFilesData || !Array.isArray(allFilesData) || allFilesData.length === 0) { 
            console.warn('No video files available for tag filtering');
            return;
        }
        const filteredFiles = allFilesData.filter(file => file.tags && file.tags.includes(tag));
        console.log(`Tag filter "${tag}": ${filteredFiles?.length || 0} files found`);
        
        setFilteredData(filteredFiles);
        setFolderData(filteredFiles.slice(0, itemsPerPage)); // Show first page of filtered results
        setPage(1); // Reset to first page
        setTotalPages(Math.max(1, Math.ceil((filteredFiles?.length || 0) / itemsPerPage)));
        setShouldLoadThumbnails(true);
    };


    // tag listup function to use as options in tag filter
    const tagsListup = async() => {
        const allTagsList = [];

        if (allFilesData && Array.isArray(allFilesData)) {
            allFilesData.forEach(file => {
                if (file.tags && Array.isArray(file.tags)) {
                    file.tags.forEach(tag => {
                        if (!allTagsList.includes(tag)) {
                            allTagsList.push(tag);
                        }
                    });
                }
            });
        }
        console.log('Video tags found:', allTagsList?.length || 0, 'unique tags');
        setTagsList(allTagsList);
    };

    // useEffect to update tags list when videoFiles change
    useEffect(() => {
        if (allFilesData && (allFilesData?.length || 0) > 0) {
            tagsListup();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allFilesData]);

    // useEffect for fetching folder data when folderPath changes
    useEffect(() => {
        async function fetchFolderManagement() {
            setIsLoading(true);
            if (!folderPath) {
                setError('Folder path is not set');
                setIsLoading(false);
                return;
            }

            if (!fileDataGet) {
                setIsLoading(false);
                return;
            }

            try {
                // Always check for existing JSON file first (unless force refresh)
                if (useExistingData) {
                    console.log("Checking for existing JSON file...");
                    const existingCheck = await checkExistingJsonFile();
                    const jsonFilePath = existingCheck.json_path;

                    console.log("Existing JSON file check:", existingCheck.json_path);

                    if (existingCheck.exists === true) {
                        console.log(`Existing JSON file found (${jsonFilePath})`);
                        
                        try {
                            // Load existing data
                            const response = await fetch(`http://localhost:5000/management/json/list/files?jsonPath=${encodeURIComponent(jsonFilePath)}`);
                            if (response.ok) {
                                const data = await response.json();
                                if (data.status === 'success' && data.files) {
                                    setFileJsonPath(jsonFilePath);
                                    setFolderData(data.files);
                                    setError(null);
                                    setIsLoading(false);
                                    
                                    // Update cache if data came from server
                                    if (existingCheck.source === 'server') {
                                        setJsonFileCache(prev => ({
                                            ...prev,
                                            [folderPath]: jsonFilePath
                                        }));
                                    }
                                    
                                    // Trigger thumbnail loading for existing data
                                    setShouldLoadThumbnails(true);
                                    createFolderGraph(); // Fetch folder graph data
                                    tagsListup(); // Update tag list
                                    
                                    console.log(`Loaded ${data.files.length} files from existing JSON (${existingCheck.source})`);
                                    return; // Exit early, don't create new JSON
                                }
                            }
                        } catch (error) {
                            console.warn('Failed to load existing data, will create new:', error);
                            // Remove invalid cache entry
                            const newCache = { ...jsonFileCache };
                            delete newCache[folderPath];
                            setJsonFileCache(newCache);
                        }
                    }
                }

                // Only create new JSON if no existing file found or force refresh
                console.log("Creating new JSON file (existing not found or force refresh)...");

                // Fetch folder list data
                console.log("Fetching folder list data...");
                const res_folder_list = await fetch(
                    `http://localhost:5000/management/folder/view/files?folderPath=${encodeURIComponent(folderPath)}`
                );                
                
                console.log("Folder list response status:", res_folder_list.status);
                console.log("Folder list response headers:", res_folder_list.headers);
                
                if (!res_folder_list.ok) {
                    const errorText = await res_folder_list.text();
                    console.log("Error response text:", errorText);
                    setError(`API Error: ${res_folder_list.status} ${res_folder_list.statusText}. Response: ${errorText.substring(0, 200)}...`);
                    setIsLoading(false);
                    return;
                }

                const contentType = res_folder_list.headers.get('content-type');
                console.log("Content-Type:", contentType);
                
                if (!contentType || !contentType.includes('application/json')) {
                    const responseText = await res_folder_list.text();
                    console.log("Non-JSON response:", responseText.substring(0, 300));
                    setError(`Expected JSON response but got: ${contentType}. Response: ${responseText.substring(0, 200)}...`);
                    setIsLoading(false);
                    return;
                }

                const json_folder_list = await res_folder_list.json();
                console.log("Parsed JSON response:", json_folder_list);
                
                if (json_folder_list.status === "error") {
                    setError(`Backend Error: ${json_folder_list.message}`);
                    setIsLoading(false);
                    return;
                }
                
                const json_path = json_folder_list.json_path;
                setFileJsonPath(json_path);
                
                if (!json_folder_list.files || !Array.isArray(json_folder_list.files)) {
                    setError('Invalid response: files data is missing or not an array');
                    setIsLoading(false);
                    return;
                }
                
                // Filter and store only video files
                const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm', '.m4v', '.3gp', '.3g2', '.f4v', '.swf', '.mxf', '.ts', '.m2ts', '.vob'];
                const videoOnlyFiles = json_folder_list.files.filter(file => 
                    videoExtensions.some(ext => file.path.toLowerCase().endsWith(ext))
                );
                
                console.log(`Filtered ${videoOnlyFiles?.length || 0} video files from ${json_folder_list.files?.length || 0} total files`);
                setAllFilesData(videoOnlyFiles);

                // Calculate first page data using current page size
                const firstPageData = videoOnlyFiles.slice(0, itemsPerPage);
                setFolderData(firstPageData);
                
                // Calculate total pages based on video files
                const totalPages = Math.max(1, Math.ceil((videoOnlyFiles?.length || 0) / itemsPerPage));
                setTotalPages(totalPages);
                
                console.log(`Loaded ${videoOnlyFiles?.length || 0} video files, showing first ${firstPageData?.length || 0} items, ${totalPages} total pages`);
                createFolderGraph(); // Fetch folder graph data
                tagsListup(); // Update tag list

                setError(null);
                setIsLoading(false);            
            } catch (err) {
                setError(`Fetch error: ${err.message}`);
                setIsLoading(false);
            } finally {
                setUseExistingData(true);
            }
        }
        // Fetch only when explicitly requested via fileDataGet trigger
        if (folderPath && fileDataGet) {
            fetchFolderManagement();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fileDataGet]);


    // Manual search handler
    const handleSearch = async () => {
        if (!basePath) {
            setError('Please set the base path before searching');
            return;
        }
        
        console.log('Search requested - using existing data if available');
        console.log('Current allDirs state:', allDirs?.length || 0, 'folders');
        setUseExistingData(true); // Try to use existing data
        setError(null);
        setPage(1); // Reset pagination
        
        // Trigger search
        setFileDataGet(current => !current);
    };

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            fontFamily: 'Arial, sans-serif',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Modern Header with Navigation */}
            <header style={{
                background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #4b79a1 100%)',
                padding: '30px 40px',
                borderRadius: '0 0 25px 25px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Decorative Background Elements */}
                <div style={{
                    position: 'absolute',
                    top: '-50px',
                    right: '-50px',
                    width: '200px',
                    height: '200px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                    zIndex: 1
                }}></div>
                <div style={{
                    position: 'absolute',
                    bottom: '-30px',
                    left: '-30px',
                    width: '150px',
                    height: '150px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)',
                    zIndex: 1
                }}></div>
                
                <div style={{ position: 'relative', zIndex: 2 }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px'
                    }}>
                        <div>
                            <h1 style={{ 
                                color: 'white', 
                                margin: '0 0 10px 0', 
                                fontSize: '36px',
                                fontWeight: '300',
                                letterSpacing: '2px',
                                textShadow: '0 2px 10px rgba(0,0,0,0.3)'
                            }}>
                                📹 Video Viewer
                            </h1>
                            <p style={{
                                color: 'rgba(255,255,255,0.8)',
                                margin: 0,
                                fontSize: '16px',
                                fontWeight: '300'
                            }}>
                                Browse and manage your video files with ease
                            </p>
                        </div>
                        
                        {/* Navigation Buttons Integrated in Header */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            {/* Video tab – currently active */}
                            <button
                                disabled
                                style={{
                                    padding: '12px 22px',
                                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                                    color: 'white',
                                    border: '2px solid #a78bfa',
                                    borderRadius: '25px',
                                    cursor: 'default',
                                    fontSize: '15px',
                                    fontWeight: '700',
                                    boxShadow: '0 6px 18px rgba(124,58,237,0.45)',
                                    transform: 'scale(1.05)',
                                    opacity: 1
                                }}
                            >
                                📹 Video
                            </button>
                            {/* Image tab */}
                            <button
                                onClick={() => navigate("/file/image/list")}
                                style={{
                                    padding: '12px 22px',
                                    background: 'rgba(255,255,255,0.15)',
                                    color: 'white',
                                    border: '2px solid transparent',
                                    borderRadius: '25px',
                                    cursor: 'pointer',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    transition: 'all 0.2s ease',
                                    backdropFilter: 'blur(10px)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                🖼️ Image
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content with Sidebar Layout */}
            <div style={{ 
                display: 'flex', 
                flex: 1,
                gap: '30px',
                padding: '30px',
                minHeight: 'calc(100vh - 200px)'
            }}>
                {/* Left Sidebar - Path Configuration */}
                <aside style={{
                    width: '400px',
                    minWidth: '400px',
                    background: 'rgba(255,255,255,0.95)',
                    borderRadius: '20px',
                    padding: '25px',
                    height: 'fit-content',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)'
                }}>
                    <h3 style={{
                        color: '#2c3e50',
                        marginBottom: '20px',
                        fontSize: '20px',
                        fontWeight: '600',
                        textAlign: 'center',
                        padding: '10px 0',
                        borderBottom: '2px solid #e9ecef'
                    }}>
                        📁 Path Configuration
                    </h3>

                    {/* Path Configuration Table */}
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                    }}>
                        <tbody>
                            <tr>
                                <td style={{ 
                                    padding: '15px',
                                    backgroundColor: '#f8f9fa',
                                    fontWeight: 'bold',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #dee2e6',
                                    color: '#495057',
                                    fontSize: '14px'
                                }}>
                                    Base Folder Path
                                </td>
                            </tr>
                            <tr>
                                <td style={{ 
                                    padding: '15px',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #dee2e6'
                                }}>
                                    <input 
                                        type="text" 
                                        value={basePath}
                                        onChange={(e) => setBasePath(e.target.value)}
                                        style={{ 
                                            width: '100%', 
                                            padding: '12px',
                                            border: '2px solid #e9ecef',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            transition: 'border-color 0.3s ease',
                                            outline: 'none'
                                        }}
                                        placeholder="e.g., C:/Users/YourName/Documents"
                                        onFocus={(e) => e.target.style.borderColor = '#007bff'}
                                        onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                                    />
                                    <small style={{ color: '#666', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                                        📂 Enter the base directory path
                                    </small>
                                    <button
                                        type="button"
                                        onClick={handlePickBasePath}
                                        style={{
                                            marginTop: '10px',
                                            padding: '10px 14px',
                                            backgroundColor: '#007bff',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '14px'
                                        }}
                                    >
                                        📂 Browse Base Folder
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td style={{ 
                                    padding: '15px',
                                    backgroundColor: '#f8f9fa',
                                    fontWeight: 'bold',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #dee2e6',
                                    color: '#495057',
                                    fontSize: '14px'
                                }}>
                                    Relative Path - Select Folder
                                </td>
                            </tr>
                            <tr>
                                <td style={{ 
                                    padding: '15px',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #dee2e6'
                                }}>
                                    <select 
                                        value={relativePath}
                                        onChange={(e) => handleFolderSelect(e.target.value)}
                                        disabled={!basePath || (allDirs?.length || 0) === 0}
                                        style={{ 
                                            width: '100%', 
                                            padding: '12px',
                                            border: '2px solid #e9ecef',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            transition: 'border-color 0.3s ease',
                                            outline: 'none',
                                            backgroundColor: (!basePath || (allDirs?.length || 0) === 0) ? '#f8f9fa' : '#fff',
                                            cursor: (!basePath || (allDirs?.length || 0) === 0) ? 'not-allowed' : 'pointer'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = '#28a745'}
                                        onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                                    >
                                        <option value="">
                                            {!basePath ? 'Please set base path first' : 
                                             (allDirs?.length || 0) === 0 ? 'No folders available' : 
                                             'Select a folder...'}
                                        </option>
                                        {allDirs.map((folder, index) => (
                                            <option key={index} value={folder}>
                                                📁 {folder}
                                            </option>
                                        ))}
                                    </select>
                                    <small style={{ color: '#666', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                                        📂 Choose from available folders in base directory
                                        {(allDirs?.length || 0) > 0 && (
                                            <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                                                <p />
                                                    {` (${allDirs?.length || 0} folders found)`}
                                            </span>
                                        )}
                                    </small>
                                </td>
                            </tr>
                            {basePath && relativePath && (
                                <tr style={{ backgroundColor: '#e8f5e8' }}>
                                    <td style={{ 
                                        padding: '15px',
                                        textAlign: 'left',
                                        color: '#155724',
                                        fontFamily: 'monospace',
                                        fontSize: '13px',
                                        wordBreak: 'break-all',
                                        backgroundColor: '#d4edda',
                                        fontWeight: 'bold'
                                    }}>
                                        <div style={{ marginBottom: '5px', color: '#155724' }}>
                                            ✅ Full Path Preview:
                                        </div>
                                        {basePath}/{relativePath}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    {/* Search Controls */}
                    <div style={{ 
                        marginTop: '25px',
                        padding: '20px',
                        background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
                        borderRadius: '15px',
                        border: '1px solid #dee2e6'
                    }}>
                        <button 
                            onClick={() => handleSearch()}
                            disabled={isLoading || !basePath}
                            style={{ 
                                width: '100%',
                                padding: '15px 25px',
                                background: isLoading || !basePath
                                    ? 'linear-gradient(135deg, #6c757d, #5a6268)' 
                                    : 'linear-gradient(135deg, #28a745, #20c997)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                cursor: isLoading || !basePath ? 'not-allowed' : 'pointer',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)'
                            }}
                            onMouseEnter={(e) => {
                                if (!isLoading && basePath) {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 6px 20px rgba(40, 167, 69, 0.4)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 4px 15px rgba(40, 167, 69, 0.3)';
                            }}
                        >
                            {isLoading ? '🔍 Searching...' : '🔍 Search Videos'}
                        </button>
                        
                        {folderData && (
                            <div style={{
                                marginTop: '15px',
                                textAlign: 'center',
                                padding: '10px',
                                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                                borderRadius: '8px',
                                border: '1px solid rgba(40, 167, 69, 0.2)'
                            }}>
                                <span style={{ 
                                    color: '#155724', 
                                    fontSize: '14px',
                                    fontWeight: 'bold'
                                }}>
                                    ✅ Number of files in this folder: {allFilesData?.length || 0}
                                </span>
                            </div>
                        )}
                        
                        {!basePath && (
                            <div style={{
                                marginTop: '15px',
                                padding: '12px 15px',
                                backgroundColor: '#fff3cd',
                                border: '1px solid #ffeaa7',
                                borderRadius: '8px',
                                color: '#856404',
                                fontSize: '14px'
                            }}>
                                💡 Please set the Base Path. Relative Path is optional — if omitted, the base folder itself will be scanned.
                            </div>
                        )}
                    </div>

                    {/* Loading Indicator */}
                    {isLoading && (
                        <div style={{
                            marginTop: '20px',
                            textAlign: 'center',
                            padding: '15px',
                            background: 'linear-gradient(135deg, #007bff, #0056b3)',
                            borderRadius: '12px',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '16px'
                        }}>
                            🔄 Loading folder data...
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div style={{ 
                            marginTop: '20px', 
                            padding: '15px', 
                            backgroundColor: '#f8d7da', 
                            color: '#721c24',
                            border: '1px solid #f5c6cb',
                            borderRadius: '12px',
                            fontWeight: 'bold'
                        }}>
                            ❌ {error}
                        </div>
                    )}
                </aside>

                {/* Main Content Area - Right Side */}
                <main style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px'
                }}>
                    {/* Filtering Section */}
                    <div style={{ flex: 1 }}>
                    
                    {/* Filtering Options */}
                    <div style={{
                        backgroundColor: '#f8f9fa',
                        border: '2px solid #e9ecef',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        marginBottom: '1rem',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                        <h3 style={{
                            color: '#495057',
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            🔍 Filtering Options
                        </h3>
                        
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1rem',
                            alignItems: 'end'
                        }}>
                            {/* Search Input */}
                            <div>
                                <label style={{ 
                                    display: 'block', 
                                    marginBottom: '5px', 
                                    fontWeight: '500',
                                    color: '#495057',
                                    fontSize: '14px'
                                }}>
                                    📝 File Name Search
                                </label>
                                <input
                                    type="text"
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                    placeholder="Enter file name..."
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '2px solid #dee2e6',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        backgroundColor: '#fff'
                                    }}
                                />
                            </div>
                            
                            {/* Extension Filter */}
                            <div>
                                <label style={{ 
                                    display: 'block', 
                                    marginBottom: '5px', 
                                    fontWeight: '500',
                                    color: '#495057',
                                    fontSize: '14px'
                                }}>
                                    📄 Extension Filter
                                </label>
                                <select
                                    value={extensionFilter}
                                    onChange={(e) => setExtensionFilter(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '2px solid #dee2e6',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        backgroundColor: '#fff'
                                    }}
                                >
                                    <option value="all">All</option>
                                    <option value="mp4">MP4</option>
                                    <option value="avi">AVI</option>
                                    <option value="mkv">MKV</option>
                                    <option value="mov">MOV</option>
                                    <option value="wmv">WMV</option>
                                    <option value="flv">FLV</option>
                                </select>
                            </div>
                            
                            {/* Size Filter */}
                            <div>
                                <label style={{ 
                                    display: 'block', 
                                    marginBottom: '5px', 
                                    fontWeight: '500',
                                    color: '#495057',
                                    fontSize: '14px'
                                }}>
                                    📊 Size Filter
                                </label>
                                <select
                                    value={sizeFilter}
                                    onChange={(e) => setSizeFilter(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '2px solid #dee2e6',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        backgroundColor: '#fff'
                                    }}
                                >
                                    <option value="all">All</option>
                                    <option value="small">Small (&lt;100MB)</option>
                                    <option value="medium">Medium (100-500MB)</option>
                                    <option value="large">Large (500MB-1GB)</option>
                                    <option value="xlarge">Extra Large (&gt;1GB)</option>
                                </select>
                            </div>
                            
                            {/* Tag Filter */}
                            {tagsList && (tagsList?.length || 0) > 0 && (
                                <div>
                                    <label style={{ 
                                        display: 'block', 
                                        marginBottom: '5px', 
                                        fontWeight: '500',
                                        color: '#495057',
                                        fontSize: '14px'
                                    }}>
                                        🏷️ Tag Filter   
                                    </label>
                                    <select
                                        value={selectedTag}
                                        onChange={(e) => setSelectedTag(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: '2px solid #dee2e6',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            backgroundColor: '#fff'
                                        }}
                                    >
                                        <option value="">Select a tag...</option>
                                        {tagsList.map(tag => (
                                            <option key={tag} value={tag}>{tag}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Items Per Page */}
                            <div>
                                <label style={{ 
                                    display: 'block', 
                                    marginBottom: '5px', 
                                    fontWeight: '500',
                                    color: '#495057',
                                    fontSize: '14px'
                                }}>
                                    📄 Items Per Page
                                </label>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setPage(1);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '2px solid #dee2e6',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        backgroundColor: '#fff'
                                    }}
                                >
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                    <option value={200}>200</option>
                                </select>
                            </div>
                            
                            {/* Clear Filters Button */}
                            <div>
                                <button
                                    onClick={clearAllFilters}
                                    style={{
                                        width: '100%',
                                        padding: '8px 16px',
                                        backgroundColor: '#6c757d',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s ease'
                                    }}
                                    onMouseOver={(e) => e.target.style.backgroundColor = '#5a6268'}
                                    onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
                                >
                                    🗑️ Clear Filtering options
                                </button>
                            </div>
                        </div>
                        
                        {/* Filter Results Summary */}
                        {(extensionFilter !== 'all' || sizeFilter !== 'all' || searchKeyword || selectedTag) && (
                            <div style={{
                                marginTop: '1rem',
                                padding: '8px 12px',
                                backgroundColor: '#d1ecf1',
                                border: '1px solid #bee5eb',
                                borderRadius: '6px',
                                fontSize: '14px',
                                color: '#0c5460'
                            }}>
                                📋 Filtering: {filteredData ? (filteredData?.length || 0) : 0} results found
                                {extensionFilter !== 'all' && ` | Extension: ${extensionFilter}`}
                                {sizeFilter !== 'all' && ` | Size: ${sizeFilter}`}
                                {searchKeyword && ` | Search: "${searchKeyword}"`}
                                {selectedTag && ` | Tag: ${selectedTag}`}
                            </div>
                        )}
                    </div>

                    {/* Status and Results with Pagination */}
                    <div style={{
                        backgroundColor: '#f0fff4',
                        border: '2px solid #68d391',
                        borderRadius: '16px',
                        padding: '1rem 1.5rem',
                        marginBottom: '2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem'
                    }}>
                        <div style={{
                            color: '#22543d',
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            flexShrink: 0
                        }}>
                            <span>
                                {(() => {
                                    const totalFiles = allFilesData ? allFilesData.length : 0;
                                    const currentPageFiles = folderData?.length || 0;
                                    
                                    if (totalFiles === 0) {
                                        return "0 video files";
                                    }
                                    
                                    const perPage = itemsPerPage;
                                    const startIndex = (page - 1) * perPage + 1;
                                    const endIndex = Math.min(startIndex + currentPageFiles - 1, totalFiles);

                                    // Example: "51-100 / 250 video files"
                                    if (filteredData) {
                                        return `${startIndex}-${endIndex} (Total: ${filteredData.length} videos)`;
                                    }

                                    return `${startIndex}-${endIndex} (Total: ${totalFiles} videos)`;
                                })()}
                            </span>
                            
                            {/* Pagination Controls as spans */}
                            <span style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <button 
                                    disabled={page === 1} 
                                    onClick={() => setPage(page - 1)}
                                    style={{
                                        padding: '6px 12px',
                                        backgroundColor: page === 1 ? '#e9ecef' : '#22543d',
                                        color: page === 1 ? '#6c757d' : 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: page === 1 ? 'not-allowed' : 'pointer',
                                        fontSize: '13px',
                                        fontWeight: 'bold'
                                    }}
                                > 
                                    ← 前へ 
                                </button>

                                <span style={{
                                    padding: '6px 12px',
                                    backgroundColor: 'rgba(34,84,61,0.1)',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: 'bold',
                                    color: '#22543d',
                                    border: '1px solid #68d391'
                                }}>
                                    {page} / {totalPages}
                                </span> 
                                
                                <button 
                                    disabled={page === totalPages} 
                                    onClick={() => setPage(page + 1)}
                                    style={{
                                        padding: '6px 12px',
                                        backgroundColor: page === totalPages ? '#e9ecef' : '#22543d',
                                        color: page === totalPages ? '#6c757d' : 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: page === totalPages ? 'not-allowed' : 'pointer',
                                        fontSize: '13px',
                                        fontWeight: 'bold'
                                    }}
                                > 
                                    次へ → 
                                </button>
                            </span>
                        </div>
                    </div>

                    {/* File Cards Display */}
                    <div style={{ 
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '20px',
                        padding: '20px 0'
                    }}>
                        {folderData.map((file, index) => (
                           <div key={file.path} style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #dee2e6',
                                borderRadius: '12px',
                                padding: '15px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                            }}
                            >
                                {/* Header with file name and extension */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '12px',
                                    borderBottom: '1px solid #e9ecef',
                                    paddingBottom: '8px'
                                }}>
                                    <h4 style={{
                                        margin: 0,
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        color: '#2c3e50',
                                        wordBreak: 'break-word',
                                        flex: 1
                                    }}>
                                        {file.name || 'Unknown File'}
                                    </h4>
                                    <span style={{
                                        backgroundColor: '#e9ecef',
                                        padding: '3px 6px',
                                        borderRadius: '8px',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        color: '#495057',
                                        marginLeft: '8px'
                                    }}>
                                        {file.extension || 'none'}
                                    </span>
                                </div>

                                {/* Thumbnail - Responsive Size */}
                                <div style={{
                                    textAlign: 'center',
                                    marginBottom: '12px'
                                }}>
                                    {thumbnailLoadingState[file.id] ? (
                                        <div style={{ 
                                            width: '100%',
                                            height: '160px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backgroundColor: '#f1f3f5',
                                            borderRadius: '8px',
                                            border: '1px solid #dee2e6',
                                            color: '#6c757d',
                                            fontSize: '12px'
                                        }}>
                                            Loading...
                                        </div>
                                    ) : thumbnailList[file.id] ? (
                                        <img
                                            src={thumbnailList[file.id]}
                                            alt="Thumbnail"
                                            style={{ 
                                                width: '100%',
                                                height: '160px',
                                                objectFit: 'cover',
                                                borderRadius: '8px',
                                                border: '1px solid #dee2e6',
                                                cursor: 'pointer'
                                            }}
                                            onLoad={(e) => {
                                                console.log(`✅ Image loaded successfully for file ${file.id}`);
                                            }}
                                            onError={(e) => {
                                                console.error(`❌ Image failed to load for file ${file.id}:`, e.target.src);
                                            }}
                                            onClick={() => {
                                                if (fileJsonPath) {
                                                    navigate(`/file/video/view/${file.id}`, { state: { jsonPath: fileJsonPath, file: file } });
                                                } else {
                                                    setError('JSON path is not available. Please reload the folder data.');
                                                }
                                            }}
                                        />
                                    ) : (
                                        <div style={{ 
                                            width: '100%',
                                            height: '160px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backgroundColor: '#f1f3f5',
                                            borderRadius: '8px',
                                            border: '1px solid #dee2e6',
                                            color: '#6c757d',
                                            fontSize: '12px'
                                        }}>
                                            No Thumbnail
                                        </div>
                                    )}
                                </div>

                                {/* File Info */}
                                <div style={{
                                    marginBottom: '15px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }}>
                                    <div style={{ 
                                        fontSize: '12px',
                                        color: '#888',
                                        backgroundColor: '#f8f9fa',
                                        padding: '8px',
                                        borderRadius: '4px'
                                    }}>
                                        <strong>Size:</strong> {file.size === 0 ? '0 bytes' : 
                                            file.size >= 1024 * 1024 * 1024 * 1024 ? `${(file.size / (1024 * 1024 * 1024 * 1024)).toFixed(2)} TB` :
                                            file.size >= 1024 * 1024 * 1024 ? `${(file.size / (1024 * 1024 * 1024)).toFixed(2)} GB` :
                                            file.size >= 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` :
                                            file.size >= 1024 ? `${(file.size / 1024).toFixed(2)} KB` :
                                            `${file.size.toLocaleString()} bytes`}
                                    </div>
                                    <div style={{
                                        fontSize: '12px',
                                        color: '#888',
                                        wordBreak: 'break-word',
                                        backgroundColor: '#f8f9fa',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <span style={{ flex: '1', minWidth: '0' }}>
                                            <strong>Path:</strong> {file.path}
                                        </span>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(file.path).then(() => {
                                                    const button = document.activeElement;
                                                    if (button) {
                                                        const originalText = button.textContent;
                                                        const originalColor = button.style.backgroundColor;
                                                        button.textContent = '✓';
                                                        button.style.backgroundColor = '#d4edda';
                                                        setTimeout(() => {
                                                            button.textContent = originalText;
                                                            button.style.backgroundColor = originalColor;
                                                        }, 1000);
                                                    }
                                                }).catch(() => {
                                                    alert('Failed to copy path to clipboard');
                                                });
                                            }}
                                            style={{
                                                padding: '4px 8px',
                                                fontSize: '10px',
                                                backgroundColor: '#007bff',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                flexShrink: '0',
                                                whiteSpace: 'nowrap'
                                            }}
                                            title="Copy path to clipboard"
                                        >
                                            Copy
                                        </button>
                                    </div>

                                    <div style={{
                                        fontSize: '12px',
                                        color: '#888',
                                        backgroundColor: '#f8f9fa',
                                        padding: '8px',
                                        borderRadius: '4px'
                                    }}>
                                        <strong>Tags:</strong>
                                        {file.tags.length === 0 ? ' None' : 
                                            file.tags.map((tag, index) => (
                                                <span key={index} style={{ 
                                                    marginTop: '4px',
                                                    backgroundColor: '#90EE90',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    display: 'inline-block',
                                                    marginLeft: '4px',
                                                    marginRight: '2px'
                                                }}>
                                                    <button onClick={() => tagsFilter(tag)} style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        padding: 0,
                                                        margin: 0,
                                                        fontSize: '12px',
                                                        color: '#155724',
                                                        cursor: 'pointer'
                                                    }}>
                                                        {tag}
                                                    </button>
                                                </span>
                                            ))
                                        }
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    <button
                                        onClick={() => {
                                            if (fileJsonPath) {
                                                navigate(`/file/video/view/${file.id}`, { state: { jsonPath: fileJsonPath, file: file } });
                                            } else {
                                                setError('JSON path is not available. Please reload the folder data.');
                                            }
                                        }}
                                        style={{ 
                                            padding: "6px 10px", 
                                            backgroundColor: '#007bff',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '10px',
                                            fontWeight: 'bold',
                                            flex: 1
                                        }}
                                    >
                                        View Details
                                    </button>

                                    {/* Rename Check */}
                                    <label style={{
                                        fontSize: '10px',
                                        color: '#666',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                    }}>
                                        <input 
                                            type="checkbox" 
                                            checked={checkedFiles[file.id] !== undefined}
                                            onChange={(e) => handleCheck(file.id, e.target.checked)}
                                            style={{ width: '12px', height: '12px' }}
                                        />
                                        Rename
                                    </label>
                                </div>

                                {/* Rename Input */}
                                {checkedFiles && checkedFiles[file.id] !== undefined && (
                                    <div style={{ marginTop: '12px' }}>
                                        <input
                                            type="text"
                                            value={checkedFiles[file.id] || ''}
                                            onChange={(e) => renameInputChange(file.id, e.target.value)}
                                            style={{ 
                                                width: '100%',
                                                height: '35px',
                                                padding: '8px 12px',
                                                fontSize: '12px',
                                                border: '2px solid #ddd',
                                                borderRadius: '6px',
                                                backgroundColor: '#fff',
                                                boxSizing: 'border-box',
                                                fontWeight: '500',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                            }}
                                            placeholder={file.name || ''}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Rename Execution Button */}
                    {Object.keys(checkedFiles).length > 0 && (
                        <div style={{ 
                            textAlign: 'center', 
                            margin: '30px 0',
                            padding: '20px',
                            backgroundColor: 'rgba(40, 167, 69, 0.1)',
                            borderRadius: '10px',
                            border: '2px dashed #28a745'
                        }}>
                            <button onClick={() => renameExecute()} style={{ 
                                padding: '15px 30px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                                transform: 'scale(1)',
                                transition: 'all 0.2s ease',
                                minWidth: '200px',
                                textTransform: 'uppercase',
                                letterSpacing: '1px'
                            }}
                            onMouseOver={(e) => {
                                e.target.style.transform = 'scale(1.05)';
                                e.target.style.backgroundColor = '#218838';
                            }}
                            onMouseOut={(e) => {
                                e.target.style.transform = 'scale(1)';
                                e.target.style.backgroundColor = '#28a745';
                            }}>
                                🔄 RENAME CHECKED FILES
                            </button>
                            <div style={{
                                marginTop: '10px',
                                fontSize: '14px',
                                color: '#666',
                                fontStyle: 'italic'
                            }}>
                                {Object.keys(checkedFiles).length} files selected for renaming
                            </div>
                        </div>
                    )}
                    </div>

                    {renameCheck === true && (
                        <div style={{
                            textAlign: 'center',
                            marginTop: '20px',
                            padding: '15px',
                            backgroundColor: '#d4edda',
                            border: '1px solid #c3e6cb',
                            borderRadius: '8px',
                            color: '#155724',
                            fontSize: '16px',
                            fontWeight: '600'
                        }}>
                            Rename operation completed successfully!
                        </div>
                    )    
                    }
                </main>
            </div>
        </div>
    );
}

export default VideoCheckPage;