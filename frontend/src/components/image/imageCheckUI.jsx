import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    GetRelativePath, 
    PickBaseFolder,
    ChangeNameSeveral, 
    BatchAddTagsToFiles,
    CheckExistingJson, 
    ListJsonData, 
    ViewFiles 
} from '../../api/imageManagementApi';

function safeParseJson(value, fallbackValue) {
    try {
        return value ? JSON.parse(value) : fallbackValue;
    } catch (e) {
        console.warn('Failed to parse cached JSON. Using fallback value.', e);
        return fallbackValue;
    }
}

function PictureViewerPage() {
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
        return safeParseJson(cached, null);
    });

    // all files data (complete dataset) - restore from localStorage if available
    const [allFilesData, setAllFilesData] = useState(() => {
        const cached = localStorage.getItem('folderManagement_allFilesData');
        return safeParseJson(cached, null);
    });


    // JSON path for passing to file details page - restore from localStorage
    const [fileJsonPath, setFileJsonPath] = useState(() => {
        return localStorage.getItem('folderManagement_fileJsonPath') || null;
    });

    const [fileDataGet, setFileDataGet] = useState(false);
    const [useExistingData, setUseExistingData] = useState(true); // Control whether to use existing JSON files
    const [jsonFileCache, setJsonFileCache] = useState({}); // Cache for existing JSON file paths

    // Error state
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Save states to localStorage whenever they change
    useEffect(() => {
        if (basePath) localStorage.setItem('folderManagement_basePath', basePath);
    }, [basePath]);

    useEffect(() => {
        if (relativePath) localStorage.setItem('folderManagement_relativePath', relativePath);
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
        if (fileJsonPath) {
            localStorage.setItem('folderManagement_fileJsonPath', fileJsonPath);
        }
    }, [fileJsonPath]);



    const [allDirs, setAllDirs] = useState(() => {
        const stored = localStorage.getItem('imageViewer_allDirs');
        return safeParseJson(stored, []);
    });

    // Save allDirs to localStorage when it changes
    useEffect(() => {
        if (allDirs.length > 0) {
            localStorage.setItem('imageViewer_allDirs', JSON.stringify(allDirs));
        }
    }, [allDirs]);

    // Handler for folder selection from dropdown – immediately triggers image load
    const handleFolderSelect = (selectedFolder) => {
        if (!selectedFolder) return;
        setRelativePath(selectedFolder);
        setError(null);
        setUseExistingData(true);
        // folderPath useEffect depends on basePath+relativePath state, but state isn't
        // updated yet here, so trigger the fetch with the known path directly.
        const newFolderPath = basePath + "\\" + selectedFolder;
        setFolderPath(newFolderPath);
        setFileDataGet(false);
        setTimeout(() => setFileDataGet(true), 0);
    };

    // Open native folder picker (via backend) and set base path
    const handlePickBasePath = async () => {
        try {
            const picked = await PickBaseFolder();
            if (picked.status === 'success' && picked.base_path) {
                setBasePath(picked.base_path);
                setRelativePath('');
                setError(null);
            } else if (picked.status === 'error') {
                setError(picked.message || 'Failed to pick base folder.');
            }
        } catch (e) {
            setError(`Failed to open folder picker: ${e.message}`);
        }
    };
    
    /* 
    Auto-fetch folders to display relative paths in selective dropdown when basePath changes.
    Debounced by 600 ms so the API is called only after the user stops typing.
    */
    useEffect(() => {
        if (!basePath) {
            setAllDirs([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                console.log('Fetching folders for basePath:', basePath);
                const data = await GetRelativePath(basePath);

                if (data.status === 'error') {
                    setAllDirs([]);
                    setError(data.message || 'Failed to fetch folders.');
                    return;
                }
                
                if (data.folders && Array.isArray(data.folders)) {
                    setAllDirs(data.folders);
                    setError(null);
                } else {
                    setAllDirs([]);
                }
            } catch (error) {
                console.error('Error fetching folders:', error);
                setAllDirs([]);
                setError(`Error fetching folders: ${error.message}`);
            }
        }, 600);

        return () => clearTimeout(timer);
    }, [basePath]);

    // set folderPath when basePath or relativePath changes
    useEffect(() => { 
        if (basePath && relativePath) { 
            setFolderPath(basePath + "\\" + relativePath); 
            console.log("Set folderPath to:", basePath + "\\" + relativePath);
        } 
    }, [basePath, relativePath]);

    // Rename check state
    const [checkedFiles, setCheckedFiles] = useState({});
    const [pendingTagMap, setPendingTagMap] = useState({});
    const [isApplyingFolderTag, setIsApplyingFolderTag] = useState(false);
    const [autoTagOnFolderSelect, setAutoTagOnFolderSelect] = useState('');

    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp']; 
    // Get imageFiles from folderData to include filtering
    const imageFiles = (folderData || []).filter(file => 
        imageExtensions.some(ext => file.path.toLowerCase().endsWith(ext)) 
    );

    const [pageSize, setPageSize] = useState(100);
    const [pageSizeInput, setPageSizeInput] = useState('100');
    const [isPageSizeMenuOpen, setIsPageSizeMenuOpen] = useState(false);
    const pageSizeMenuRef = useRef(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [gotoPageInput, setGotoPageInput] = useState('1');
    const totalPages = Math.max(1, Math.ceil(imageFiles.length / pageSize));
    const pageStartIndex = (currentPage - 1) * pageSize;
    const pagedImageFiles = imageFiles.slice(pageStartIndex, pageStartIndex + pageSize);

    useEffect(() => {
        // Keep page in valid range when filters/folder changes image count.
        setCurrentPage(prev => Math.min(Math.max(1, prev), totalPages));
    }, [totalPages]);

    useEffect(() => {
        setGotoPageInput(String(currentPage));
    }, [currentPage]);

    const goToPage = () => {
        const parsed = Number(gotoPageInput);
        if (!Number.isFinite(parsed)) return;
        const nextPage = Math.min(totalPages, Math.max(1, Math.floor(parsed)));
        setCurrentPage(nextPage);
    };

    const applyPageSize = () => {
        const parsed = Number(pageSizeInput);
        if (!Number.isFinite(parsed)) return;
        const nextSize = Math.min(5000, Math.max(1, Math.floor(parsed)));
        setPageSize(nextSize);
        setPageSizeInput(String(nextSize));
        setCurrentPage(1);
        setIsPageSizeMenuOpen(false);
    };

    const togglePageSizeMenu = () => {
        setPageSizeInput(String(pageSize));
        setIsPageSizeMenuOpen(prev => !prev);
    };

    useEffect(() => {
        if (!isPageSizeMenuOpen) return;

        const handleClickOutside = (event) => {
            if (pageSizeMenuRef.current && !pageSizeMenuRef.current.contains(event.target)) {
                setIsPageSizeMenuOpen(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setIsPageSizeMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isPageSizeMenuOpen]);

    useEffect(() => {
        // Display all data without pagination
        if (!allFilesData || !Array.isArray(allFilesData)) {
            console.warn('No allFilesData available');
            return;
        }

        console.log(`Displaying all ${allFilesData.length} items`);
        
        // Update folder data with all data
        setFolderData(allFilesData);       
    }, [allFilesData]);

    // handler for checkbox change
    const handleCheck = (fileId, checked) => {
        if (checked) {
             setCheckedFiles(prev => ({
               ...prev,
                [fileId]: ''
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
            // Call API to rename several files
            const renameResults = await ChangeNameSeveral(requestData);
            console.log("Rename results:", renameResults);
            
            if (renameResults.status === "success") {
                // Build a lookup of id -> { new_name, new_file_path } from the response
                const renamedMap = {};
                (renameResults.renamed || []).forEach(r => {
                    renamedMap[String(r.id)] = { name: r.new_name, path: r.new_file_path };
                });

                // Update allFilesData and folderData in place so UI reflects new names immediately
                const updateFiles = (files) =>
                    files.map(file => {
                        const updated = renamedMap[String(file.id)];
                        if (updated) {
                            const basename = updated.name.replace(/\.[^.]+$/, '');
                            return { ...file, name: updated.name, path: updated.path, tags: basename.split('-') };
                        }
                        return file;
                    });

                setAllFilesData(prev => prev ? updateFiles(prev) : prev);
                setFolderData(prev => prev ? updateFiles(prev) : prev);
                setCheckedFiles({});
                setError(null);
            } else {
                setError(`Rename failed: ${renameResults.message}`);
            }
        } catch (error) {
            console.error("Error renaming files:", error);
            setError(`Error renaming files: ${error.message}`);
        }
    };

    const quickTagButtons = useMemo(() => ['bf', 'hj', 'pz', 'se', 'nf', 'title', 'other'], []);
    const isQuickTag = useCallback((tag) => quickTagButtons.includes(tag), [quickTagButtons]);

    const togglePendingTag = (fileId, tag) => {
        setPendingTagMap(prev => {
            const currentTags = prev[fileId] || [];
            const nextTags = currentTags.includes(tag)
                ? currentTags.filter(value => value !== tag)
                : [...currentTags, tag];

            if (nextTags.length === 0) {
                const updated = { ...prev };
                delete updated[fileId];
                return updated;
            }

            return {
                ...prev,
                [fileId]: nextTags
            };
        });
    };

    const hasTag = (file, tag) => Array.isArray(file?.tags) && file.tags.includes(tag);

    // Apply all tags in chosen files at once
    const applyPendingTags = async () => {
        if (!fileJsonPath) {
            setError('JSON path is not available. Please reload the folder data.');
            return;
        }

        const updates = Object.entries(pendingTagMap)
            .map(([fileId, tags]) => ({
                fileId: Number(fileId),
                tags
            }))
            .filter(item => Number.isFinite(item.fileId) && Array.isArray(item.tags) && item.tags.length > 0);

        if (updates.length === 0) {
            setError('No pending tags to apply.');
            return;
        }

        try {
            const response = await BatchAddTagsToFiles({
                jsonPath: fileJsonPath,
                updates
            });

            if (response.status === 'success' && Array.isArray(response.files)) {
                setAllFilesData(response.files);
                setFolderData(response.files);

                const refreshedTags = quickTagButtons.filter(tag =>
                    response.files.some(file => Array.isArray(file.tags) && file.tags.includes(tag))
                );
                setTagsList(refreshedTags);
                setPendingTagMap({});
                setError(null);
            } else {
                setError(`Failed to apply tags: ${response.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error applying pending tags:', error);
            setError(`Error applying tags: ${error.message}`);
        }
    };

    // Apply, add, or remove a tag for the current folder or a specified list of files.
    const applyTagToCurrentFolder = async (tag, options = {}) => {
        const targetJsonPath = options.jsonPath || fileJsonPath;
        const targetFiles = Array.isArray(options.files) ? options.files : allFilesData;
        const silentNoop = Boolean(options.silentNoop);
        const mode = options.mode || 'toggle';

        if (!isQuickTag(tag)) {
            setError(`Tag filter is limited to: ${quickTagButtons.join(', ')}`);
            return;
        }

        if (!targetJsonPath) {
            setError('JSON path is not available. Please reload the folder data.');
            return;
        }

        if (!Array.isArray(targetFiles) || targetFiles.length === 0) {
            setError('No files are loaded for the selected folder.');
            return;
        }

        const updates = targetFiles
            .filter(file => Number.isFinite(Number(file.id)))
            .map(file => {
                const fileHasTag = hasTag(file, tag);

                if (mode === 'add') {
                    return fileHasTag ? null : { fileId: Number(file.id), tags: [tag] };
                }

                if (mode === 'remove') {
                    return fileHasTag ? { fileId: Number(file.id), removeTags: [tag] } : null;
                }

                return fileHasTag
                    ? { fileId: Number(file.id), removeTags: [tag] }
                    : { fileId: Number(file.id), tags: [tag] };
            })
            .filter(Boolean);

        if (updates.length === 0) {
            if (!silentNoop) {
                setError(null);
            }
            return;
        }

        setIsApplyingFolderTag(true);
        try {
            const response = await BatchAddTagsToFiles({
                jsonPath: targetJsonPath,
                updates
            });

            if (response.status === 'success' && Array.isArray(response.files)) {
                setAllFilesData(response.files);
                setFolderData(response.files);

                const refreshedTags = quickTagButtons.filter(tag =>
                    response.files.some(file => Array.isArray(file.tags) && file.tags.includes(tag))
                );
                setTagsList(refreshedTags);
                setError(null);
            } else {
                setError(`Failed to apply folder tag: ${response.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error applying folder tag:', error);
            setError(`Error applying folder tag: ${error.message}`);
        } finally {
            setIsApplyingFolderTag(false);
        }
    };
    
    // read existing JSON file to check
    const checkExistingJsonFile = async (folderPath) => {
        const data_check = await CheckExistingJson(folderPath);
        console.log('Existing JSON file check result:', data_check);            
        return data_check; // { exists: bool, json_path: string|null, source: 'server'|'local'|null }
    };

    const [, setTagsList] = useState([]); // List of all tags available

    // Filter states
    const [extensionFilter, setExtensionFilter] = useState('all');
    const [sizeFilter, setSizeFilter] = useState('all');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [selectedTag, setSelectedTag] = useState('');
    const [filteredData, setFilteredData] = useState(null);

    useEffect(() => {
        setCurrentPage(1);
    }, [relativePath, extensionFilter, sizeFilter, searchKeyword, selectedTag]);

    // Enhanced filtering function for images
    const applyFilters = useCallback(() => {
        if (!allFilesData || !Array.isArray(allFilesData)) return;
        
        let filtered = [...allFilesData];
        
        // Extension filter
        if (extensionFilter && extensionFilter !== 'all') {
            filtered = filtered.filter(file => {
                const ext = file.path.toLowerCase();
                return ext.endsWith(extensionFilter.toLowerCase());
            });
        }
        
        // Size filter
        if (sizeFilter && sizeFilter !== 'all') {
            filtered = filtered.filter(file => {
                const sizeInMB = file.size / (1024 * 1024);
                switch(sizeFilter) {
                    case 'small': return sizeInMB < 5;
                    case 'medium': return sizeInMB >= 5 && sizeInMB < 20;
                    case 'large': return sizeInMB >= 20 && sizeInMB < 50;
                    case 'xlarge': return sizeInMB >= 50;
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
        if (selectedTag && selectedTag !== '' && isQuickTag(selectedTag)) {
            filtered = filtered.filter(file => 
                file.tags && Array.isArray(file.tags) && file.tags.includes(selectedTag)
            );
        }
        
        setFilteredData(filtered);
        setFolderData(filtered); // Display all filtered data
    }, [extensionFilter, sizeFilter, searchKeyword, selectedTag, allFilesData, isQuickTag]);
    
    // Clear all filters
    const clearAllFilters = () => {
        setExtensionFilter('all');
        setSizeFilter('all');
        setSearchKeyword('');
        setSelectedTag('');
        setFilteredData(null);
    };
    
    // Apply filters when filter states change
    useEffect(() => {
        applyFilters();
    }, [applyFilters]);

    // tag filter function based on tags array in each file data
    const tagsFilter = async (tag) => {
        if (!allFilesData || !Array.isArray(allFilesData)) { 
            console.warn('No allFilesData available for tag filtering');
            return;
        }

        const normalizedTag = String(tag || '').trim();

        // Treat empty selection as "show all" without raising an error.
        if (!normalizedTag) {
            setFolderData(allFilesData);
            setError(null);
            return;
        }

        if (!isQuickTag(normalizedTag)) {
            // Ignore unknown tags silently to avoid false error popups.
            setFolderData(allFilesData);
            setError(null);
            return;
        }

        const filteredFiles = allFilesData.filter(file => file.tags && file.tags.includes(normalizedTag));
        setFolderData(filteredFiles); // Display all filtered files
        setError(null);
    };

    const clearTagFilter = async () => {
        if (!allFilesData || !Array.isArray(allFilesData)) {
            console.warn('No allFilesData available for clearing tag filter');
            return;
        }
        setFolderData(allFilesData); // Display all data
        setError(null);
    };

    // tag listup function to use as options in tag filter
    // files is always passed explicitly at call sites, so allFilesData is not needed in deps.
    const tagsListup = useCallback(async(files) => {
        if (!files || !Array.isArray(files)) {
            setTagsList([]);
            return;
        }

        const filterableTags = quickTagButtons.filter(tag =>
            files.some(file => Array.isArray(file.tags) && file.tags.includes(tag))
        );

        setTagsList(filterableTags);
    }, [quickTagButtons]);

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
                    const existingCheck = await checkExistingJsonFile(folderPath);
                    console.log("Existing JSON file check:", existingCheck.json_path);

                    if (existingCheck.exists === true) {
                        console.log(`Existing JSON file found (${existingCheck.source}):`, existingCheck.json_path);
                        
                        try {
                            // Load existing data in a JSON file - get all data without pagination
                            const data = await ListJsonData(existingCheck);
                            if (data.status === 'success' && data.files) {
                                setFileJsonPath(existingCheck.json_path);
                                setAllFilesData(data.files);
                                setFolderData(data.files);
                                if (autoTagOnFolderSelect && isQuickTag(autoTagOnFolderSelect)) {
                                    await applyTagToCurrentFolder(autoTagOnFolderSelect, {
                                        files: data.files,
                                        jsonPath: existingCheck.json_path,
                                        mode: 'add',
                                        silentNoop: true
                                    });
                                }

                                setError(null);
                                setIsLoading(false);
                                
                                // Update cache if data came from server
                                if (existingCheck.source === 'server') {
                                    setJsonFileCache(prev => ({
                                        ...prev,
                                        [folderPath]: existingCheck.json_path
                                    }));
                                }
                                tagsListup(data.files); // Update tag list
                                return; // Exit early, don't create new JSON
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
                const json_folder_list = await ViewFiles(folderPath);
                
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
                
                // Store all files data
                setAllFilesData(json_folder_list.files);
                
                // Display all data instead of pagination
                setFolderData(json_folder_list.files);
                
                console.log(`Loaded and displaying all ${json_folder_list.files.length} files`);
                tagsListup(json_folder_list.files); // Update tag list

                if (autoTagOnFolderSelect && isQuickTag(autoTagOnFolderSelect)) {
                    await applyTagToCurrentFolder(autoTagOnFolderSelect, {
                        files: json_folder_list.files,
                        jsonPath: json_path,
                        mode: 'add',
                        silentNoop: true
                    });
                }

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
        if (!basePath || !relativePath) {
            setError('Please set both base path and relative path before searching');
            return;
        }
        
        console.log('Search requested - using existing data if available');
        setUseExistingData(true); // Try to use existing data
        setError(null);
        setFileDataGet(false); // Reset first so the effect always fires
        
        // Use setTimeout to ensure the false state is committed before setting true
        setTimeout(() => setFileDataGet(true), 0);
    };

    const [index, setIndex] = useState(0);
    const [isSlideShowOpen, setIsSlideShowOpen] = useState(false);
    const [isImageOnlyMode, setIsImageOnlyMode] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);

    const next = () => {
        if (imageFiles.length === 0) return;
        setIndex(prev => (prev + 1) % imageFiles.length);
    };
    const prev = () => {
        if (imageFiles.length === 0) return;
        setIndex(prev => (prev - 1 + imageFiles.length) % imageFiles.length);
    };

    const openSlideShowAt = (absoluteIndex) => {
        if (!imageFiles || imageFiles.length === 0) return;
        const safeIndex = Math.min(Math.max(0, absoluteIndex), imageFiles.length - 1);
        setIndex(safeIndex);
        setIsImageOnlyMode(false);
        setIsSlideShowOpen(true);
    };

    const closeSlideShow = () => {
        setIsSlideShowOpen(false);
        setIsImageOnlyMode(false);
    };

    const openImageOnlyMode = () => {
        setZoomLevel(0.5);
        setPanOffset({ x: 0, y: 0 });
        setIsImageOnlyMode(true);
    };

    const exitImageOnlyMode = () => {
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
        setIsImageOnlyMode(false);
    };

    const handleImageOnlyWheel = (e) => {
        if (!isImageOnlyMode) return;
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        setZoomLevel(prev => Math.min(5, Math.max(0.5, prev + delta)));
    };

    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });
    const hasMovedRef = useRef(false);

    const handlePanMouseDown = (e) => {
        if (!isImageOnlyMode) return;
        // only primary button
        if (e.button !== 0) return;
        e.preventDefault();
        hasMovedRef.current = false;
        panStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, panX: panOffset.x, panY: panOffset.y };
        setIsPanning(true);
    };

    const handlePanMouseMove = (e) => {
        if (!isPanning) return;
        const dx = e.clientX - panStartRef.current.mouseX;
        const dy = e.clientY - panStartRef.current.mouseY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMovedRef.current = true;
        setPanOffset({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
    };

    const handlePanMouseUp = () => {
        setIsPanning(false);
    };

    const clickTimerRef = useRef(null);
    const handleImageClick = (e) => {
        if (!isImageOnlyMode) return;
        // suppress click if user dragged
        if (hasMovedRef.current) return;
        e.stopPropagation();
        if (clickTimerRef.current) {
            // second click within 300ms → double click → reset zoom
            clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
            setZoomLevel(1);
        } else {
            // first click → wait to see if double click
            clickTimerRef.current = setTimeout(() => {
                clickTimerRef.current = null;
                setZoomLevel(prev => Math.min(5, prev + 0.5));
            }, 300);
        }
    };

    // Get current image file
    const currentImageFile = imageFiles[index];

    useEffect(() => {
        if (!isSlideShowOpen) return;

        const onKeyDown = (e) => {
            if (e.key === 'ArrowRight') {
                setIndex(prev => (prev + 1) % imageFiles.length);
            }
            if (e.key === 'ArrowLeft') {
                setIndex(prev => (prev - 1 + imageFiles.length) % imageFiles.length);
            }
            if (e.key === 'Escape') {
                if (isImageOnlyMode) {
                    setIsImageOnlyMode(false);
                } else {
                    closeSlideShow();
                }
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isSlideShowOpen, isImageOnlyMode, imageFiles.length]);

    useEffect(() => {
        setZoomLevel(0.5);
        setPanOffset({ x: 0, y: 0 });
    }, [index]);

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
                                🖼️ Picture Viewer
                            </h1>
                            <p style={{
                                color: 'rgba(255,255,255,0.8)',
                                margin: 0,
                                fontSize: '16px',
                                fontWeight: '300'
                            }}>
                                Browse and manage your image files
                            </p>
                        </div>
                        
                        {/* Navigation Buttons Integrated in Header */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            {/* Video tab */}
                            <button
                                onClick={() => navigate("/file/video/list")}
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
                                📹 Video
                            </button>
                            {/* Image tab – currently active */}
                            <button
                                disabled
                                style={{
                                    padding: '12px 22px',
                                    background: 'linear-gradient(135deg, #0f766e, #14b8a6)',
                                    color: 'white',
                                    border: '2px solid #5eead4',
                                    borderRadius: '25px',
                                    cursor: 'default',
                                    fontSize: '15px',
                                    fontWeight: '700',
                                    boxShadow: '0 6px 18px rgba(20,184,166,0.45)',
                                    transform: 'scale(1.05)',
                                    opacity: 1
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
                                    <div style={{ marginTop: '10px' }}>
                                        <button
                                            type="button"
                                            onClick={handlePickBasePath}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                border: 'none',
                                                borderRadius: '8px',
                                                background: 'linear-gradient(135deg, #007bff, #0056b3)',
                                                color: '#fff',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            📂 Browse Base Folder
                                        </button>
                                    </div>
                                    <small style={{ color: '#666', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                                        📂 Enter the base directory path or use Browse
                                    </small>
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
                                        disabled={!basePath || allDirs.length === 0}
                                        style={{ 
                                            width: '100%', 
                                            padding: '12px',
                                            border: '2px solid #e9ecef',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            transition: 'border-color 0.3s ease',
                                            outline: 'none',
                                            backgroundColor: (!basePath || allDirs.length === 0) ? '#f8f9fa' : '#fff',
                                            cursor: (!basePath || allDirs.length === 0) ? 'not-allowed' : 'pointer'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = '#28a745'}
                                        onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                                    >
                                        <option value="">
                                            {!basePath ? 'Please set base path first' : 
                                             allDirs.length === 0 ? 'No folders available' : 
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
                                        {allDirs.length > 0 && (
                                            <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                                                <p />
                                                {` (${allDirs.length} folders found)`}
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
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '6px',
                                fontWeight: '600',
                                color: '#495057',
                                fontSize: '13px'
                            }}>
                                🏷️ Auto-apply this tag when folder loads
                            </label>
                            <select
                                value={autoTagOnFolderSelect}
                                onChange={(e) => setAutoTagOnFolderSelect(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '2px solid #dee2e6',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    backgroundColor: '#fff'
                                }}
                            >
                                <option value="">Disabled</option>
                                {quickTagButtons.map(tag => (
                                    <option key={`auto-tag-${tag}`} value={tag}>{tag}</option>
                                ))}
                            </select>
                            <small style={{ color: '#666', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                                When a folder is loaded, this tag is added to every file in that folder.
                            </small>
                        </div>

                        <button 
                            onClick={() => handleSearch(false)}
                            disabled={isLoading || !basePath || !relativePath}
                            style={{ 
                                width: '100%',
                                padding: '15px 25px',
                                background: isLoading || !basePath || !relativePath 
                                    ? 'linear-gradient(135deg, #6c757d, #5a6268)' 
                                    : 'linear-gradient(135deg, #28a745, #20c997)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                cursor: isLoading || !basePath || !relativePath ? 'not-allowed' : 'pointer',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)'
                            }}
                            onMouseEnter={(e) => {
                                if (!isLoading && basePath && relativePath) {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 6px 20px rgba(40, 167, 69, 0.4)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 4px 15px rgba(40, 167, 69, 0.3)';
                            }}
                        >
                            {isLoading ? '🔍 Searching...' : '🔍 Search Pictures'}
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
                                    ✅ {folderData.length} files loaded successfully
                                </span>
                            </div>
                        )}
                        
                        {(!basePath || !relativePath) && (
                            <div style={{
                                marginTop: '15px',
                                padding: '12px 15px',
                                backgroundColor: '#fff3cd',
                                border: '1px solid #ffeaa7',
                                borderRadius: '8px',
                                color: '#856404',
                                fontSize: '14px'
                            }}>
                                💡 Please set both Base Path and Relative Path to enable searching
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

                {/* Main Content Area */}
                <main style={{ 
                    flex: 1,
                    background: 'rgba(255,255,255,0.95)',
                    borderRadius: '20px',
                    padding: '30px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)'
                }}>
                    {/* Filtering Options */}
                    {folderData && (
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

                            <div style={{ marginBottom: '1rem' }}>
                                <div style={{
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    color: '#495057',
                                    marginBottom: '8px'
                                }}>
                                    ⚡ Folder-wide tag toggle
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {quickTagButtons.map((tag) => {
                                        const isAppliedToAll = Array.isArray(allFilesData)
                                            && allFilesData.length > 0
                                            && allFilesData.every(item => Array.isArray(item.tags) && item.tags.includes(tag));
                                        const isAppliedToSome = Array.isArray(allFilesData)
                                            && allFilesData.some(item => Array.isArray(item.tags) && item.tags.includes(tag));

                                        return (
                                            <button
                                                key={`folder-quick-tag-${tag}`}
                                                type="button"
                                                disabled={isApplyingFolderTag || !allFilesData || allFilesData.length === 0}
                                                onClick={() => applyTagToCurrentFolder(tag, {
                                                    mode: isAppliedToAll ? 'remove' : 'add'
                                                })}
                                                style={{
                                                    padding: '6px 10px',
                                                    border: 'none',
                                                    borderRadius: '999px',
                                                    fontSize: '12px',
                                                    fontWeight: '700',
                                                    cursor: (isApplyingFolderTag || !allFilesData || allFilesData.length === 0) ? 'not-allowed' : 'pointer',
                                                    background: isAppliedToAll
                                                        ? 'linear-gradient(135deg, #d1d5db, #9ca3af)'
                                                        : isAppliedToSome
                                                            ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                                            : 'linear-gradient(135deg, #0f766e, #14b8a6)',
                                                    color: '#fff',
                                                    opacity: (isApplyingFolderTag || !allFilesData || allFilesData.length === 0) ? 0.7 : 1,
                                                    boxShadow: isAppliedToAll
                                                        ? 'none'
                                                        : isAppliedToSome
                                                            ? '0 4px 10px rgba(245, 158, 11, 0.22)'
                                                            : '0 4px 10px rgba(20, 184, 166, 0.22)'
                                                }}
                                            >
                                                {isAppliedToAll ? `✓ ${tag}` : isAppliedToSome ? `↔ ${tag}` : tag}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            
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
                                        <option value=".jpg">JPG</option>
                                        <option value=".jpeg">JPEG</option>
                                        <option value=".png">PNG</option>
                                        <option value=".gif">GIF</option>
                                        <option value=".webp">WEBP</option>
                                        <option value=".bmp">BMP</option>
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
                                        <option value="small">Small (&lt;5MB)</option>
                                        <option value="medium">Medium (5-20MB)</option>
                                        <option value="large">Large (20-50MB)</option>
                                        <option value="xlarge">Extra Large (&gt;50MB)</option>
                                    </select>
                                </div>
                                
                                {/* Tag Filter */}
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
                                        {quickTagButtons.map(tag => (
                                            <option key={tag} value={tag}>{tag}</option>
                                        ))}
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
                                        🗑️ Clear Filters
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
                                    📋 Filters Applied: {filteredData ? filteredData.length : 0} results found
                                    {extensionFilter !== 'all' && ` | Extension: ${extensionFilter}`}
                                    {sizeFilter !== 'all' && ` | Size: ${sizeFilter}`}
                                    {searchKeyword && ` | Search: "${searchKeyword}"`}
                                    {selectedTag && ` | Tag: ${selectedTag}`}
                                </div>
                            )}
                        </div>
                    )}

                    {/* imageFiles */}
                    {folderData && (
                        <div>
                            {/* Status Bar - File Count & Pagination Controls Horizontal */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(240px, 1fr) auto',
                                gap: '16px',
                                alignItems: 'center',
                                marginBottom: '25px',
                                padding: '15px 20px',
                                background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
                                borderRadius: '15px',
                                border: '1px solid #dee2e6',
                                overflow: 'visible'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    gap: '10px',
                                    minWidth: 0
                                }}>
                                    <span style={{
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        color: '#495057',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        🖼️ {imageFiles.length} images found
                                    </span>

                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        flexWrap: 'wrap',
                                        width: '100%'
                                    }}>
                                        {quickTagButtons.length > 0 && (
                                            <>
                                                <label htmlFor="tagFilter" style={{ 
                                                    fontWeight: 'bold',
                                                    fontSize: '14px',
                                                    color: '#495057',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    🏷️ Filter by Tag:
                                                </label>
                                                <select
                                                    id="tagFilter"
                                                    style={{
                                                        padding: '8px 12px',
                                                        border: '2px solid #e9ecef',
                                                        borderRadius: '8px',
                                                        fontSize: '14px',
                                                        background: 'white',
                                                        cursor: 'pointer',
                                                        minWidth: '160px',
                                                        maxWidth: '100%'
                                                    }}  
                                                >
                                                    <option value="">-- All Tags --</option>
                                                    {quickTagButtons.map((tag, index) => (
                                                        <option key={index} value={tag}>{tag}</option>
                                                    ))}
                                                </select>

                                                <button 
                                                    onClick={() => tagsFilter(document.getElementById('tagFilter').value)}
                                                    style={{ 
                                                        padding: '8px 15px',
                                                        background: 'linear-gradient(135deg, #17a2b8, #138496)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        fontSize: '14px',
                                                        fontWeight: 'bold',
                                                        transition: 'all 0.3s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.transform = 'translateY(-1px)';
                                                        e.target.style.boxShadow = '0 4px 12px rgba(23, 162, 184, 0.3)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.transform = 'translateY(0)';
                                                        e.target.style.boxShadow = 'none';
                                                    }}
                                                >
                                                    Apply
                                                </button>

                                                <button
                                                    onClick={() => clearTagFilter()}
                                                    style={{ 
                                                        padding: '8px 15px',
                                                        background: 'linear-gradient(135deg, #6c757d, #5a6268)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        fontSize: '14px',
                                                        fontWeight: 'bold',
                                                        transition: 'all 0.3s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.transform = 'translateY(-1px)';
                                                        e.target.style.boxShadow = '0 4px 12px rgba(108, 117, 125, 0.3)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.transform = 'translateY(0)';
                                                        e.target.style.boxShadow = 'none';
                                                    }}
                                                >
                                                    Clear
                                                </button>
                                            </>
                                        )}
                                        {quickTagButtons.length === 0 && (
                                            <span style={{ 
                                                color: '#6c757d', 
                                                fontSize: '14px',
                                                fontStyle: 'italic',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                No tags available
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    flexWrap: 'nowrap',
                                    justifyContent: 'flex-end',
                                    overflow: 'visible',
                                    maxWidth: '100%',
                                    minWidth: 0
                                }}>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage <= 1}
                                        style={{
                                            padding: '8px 12px',
                                            border: 'none',
                                            borderRadius: '8px',
                                            background: currentPage <= 1
                                                ? 'linear-gradient(135deg, #ced4da, #adb5bd)'
                                                : 'linear-gradient(135deg, #007bff, #0056b3)',
                                            color: '#fff',
                                            fontWeight: '600',
                                            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        ◀ Prev
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage >= totalPages}
                                        style={{
                                            padding: '8px 12px',
                                            border: 'none',
                                            borderRadius: '8px',
                                            background: currentPage >= totalPages
                                                ? 'linear-gradient(135deg, #ced4da, #adb5bd)'
                                                : 'linear-gradient(135deg, #007bff, #0056b3)',
                                            color: '#fff',
                                            fontWeight: '600',
                                            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        Next ▶
                                    </button>

                                    <span style={{
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        color: '#495057',
                                        minWidth: '140px',
                                        textAlign: 'center',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        Page {currentPage} / {totalPages}
                                    </span>

                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        const startPage = Math.max(1, Math.min(totalPages - 4, currentPage - 2));
                                        const pageNum = startPage + i;
                                        return (
                                            <button
                                                key={pageNum}
                                                type="button"
                                                onClick={() => setCurrentPage(pageNum)}
                                                style={{
                                                    padding: '8px 10px',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    minWidth: '36px',
                                                    background: pageNum === currentPage
                                                        ? 'linear-gradient(135deg, #28a745, #1e7e34)'
                                                        : 'linear-gradient(135deg, #e9ecef, #dee2e6)',
                                                    color: pageNum === currentPage ? '#fff' : '#495057',
                                                    fontWeight: '700',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}

                                    <input
                                        type="number"
                                        min="1"
                                        max={totalPages}
                                        value={gotoPageInput}
                                        onChange={(e) => setGotoPageInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                goToPage();
                                            }
                                        }}
                                        style={{
                                            width: '80px',
                                            padding: '8px 10px',
                                            border: '2px solid #dee2e6',
                                            borderRadius: '8px',
                                            fontSize: '14px'
                                        }}
                                    />


                                    <div ref={pageSizeMenuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', overflow: 'visible' }}>
                                        <button
                                            type="button"
                                            onClick={togglePageSizeMenu}
                                            title="Page Size Settings"
                                            style={{
                                                width: '38px',
                                                height: '38px',
                                                border: 'none',
                                                borderRadius: '10px',
                                                background: isPageSizeMenuOpen
                                                    ? 'linear-gradient(135deg, #4f46e5, #4338ca)'
                                                    : 'linear-gradient(135deg, #6f42c1, #5a32a3)',
                                                color: '#fff',
                                                fontSize: '18px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                boxShadow: isPageSizeMenuOpen
                                                    ? '0 0 0 3px rgba(79, 70, 229, 0.2), 0 8px 18px rgba(79, 70, 229, 0.28)'
                                                    : '0 4px 12px rgba(111, 66, 193, 0.25)',
                                                transform: isPageSizeMenuOpen ? 'rotate(15deg)' : 'none'
                                            }}
                                        >
                                            ⚙
                                        </button>

                                        {isPageSizeMenuOpen && (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: '52px',
                                                right: 0,
                                                zIndex: 1000,
                                                minWidth: '240px',
                                                padding: '0',
                                                background: '#ffffff',
                                                border: '1px solid rgba(60, 64, 67, 0.15)',
                                                borderRadius: '14px',
                                                boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                                                overflow: 'visible'
                                            }}>
                                                <div style={{
                                                    position: 'relative',
                                                    padding: '12px 14px 14px',
                                                    background: '#fff',
                                                    borderRadius: '14px'
                                                }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        marginBottom: '10px'
                                                    }}>
                                                        <div style={{
                                                            fontSize: '13px',
                                                            fontWeight: '700',
                                                            color: '#111827'
                                                        }}>
                                                            Page Size
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsPageSizeMenuOpen(false)}
                                                            aria-label="Close page size settings"
                                                            style={{
                                                                width: '28px',
                                                                height: '28px',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                background: 'transparent',
                                                                color: '#6b7280',
                                                                fontSize: '18px',
                                                                lineHeight: '1',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                    <div style={{
                                                        position: 'absolute',
                                                        right: '14px',
                                                        bottom: '-7px',
                                                        width: '14px',
                                                        height: '14px',
                                                        background: '#fff',
                                                        borderRight: '1px solid rgba(60, 64, 67, 0.15)',
                                                        borderBottom: '1px solid rgba(60, 64, 67, 0.15)',
                                                        transform: 'rotate(45deg)'
                                                    }} />
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="5000"
                                                        value={pageSizeInput}
                                                        onChange={(e) => setPageSizeInput(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                applyPageSize();
                                                            }
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 12px',
                                                            border: '1px solid #d1d5db',
                                                            borderRadius: '10px',
                                                            fontSize: '14px',
                                                            boxSizing: 'border-box',
                                                            outline: 'none',
                                                            background: '#fff',
                                                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)'
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={applyPageSize}
                                                        style={{
                                                            marginTop: '10px',
                                                            width: '100%',
                                                            padding: '10px 12px',
                                                            border: 'none',
                                                            borderRadius: '10px',
                                                            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                                                            color: '#fff',
                                                            fontWeight: '700',
                                                            cursor: 'pointer',
                                                            boxShadow: '0 6px 16px rgba(37, 99, 235, 0.25)'
                                                        }}
                                                    >
                                                        Apply
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* All Images Grid Display */}
                            <div style={{ 
                                padding: '20px 0'
                            }}>
                                {imageFiles && imageFiles.length === 0 && (
                                    <div style={{ 
                                        marginTop: '40px',
                                        padding: '40px',
                                        background: 'linear-gradient(135deg, #fff3cd, #ffeaa7)',
                                        color: '#856404',   
                                        border: '2px solid #ffeaa7',
                                        borderRadius: '20px',
                                        textAlign: 'center',
                                        boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
                                    }}>
                                        <h3 style={{ margin: '0 0 15px 0', fontSize: '24px' }}>
                                            🔍 No image files found
                                        </h3>
                                        <p style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
                                            Folder name: <strong>{relativePath}</strong>
                                        </p>
                                        <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>
                                            Try searching in a different folder or check your path settings
                                        </p>
                                    </div>
                                )}

                                {/* Grid Display of All Images */}
                                {imageFiles && imageFiles.length > 0 && (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                        gap: '20px',
                                        padding: '20px 0'
                                    }}>
                                        {pagedImageFiles.map((file, index) => (
                                            <div key={file.path} style={{
                                                background: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
                                                border: '2px solid #e9ecef',
                                                borderRadius: '16px',
                                                padding: '20px',
                                                boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                                                transition: 'all 0.3s ease',
                                                cursor: 'default'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'translateY(-5px)';
                                                e.currentTarget.style.boxShadow = '0 12px 35px rgba(0,0,0,0.15)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)';
                                            }}
                                            >
                                                {/* Header with file name and extension */}
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                    marginBottom: '15px',
                                                    borderBottom: '1px solid #e9ecef',
                                                    paddingBottom: '10px'
                                                }}>
                                                    <h4 style={{
                                                        margin: 0,
                                                        fontSize: '16px',
                                                        fontWeight: 'bold',
                                                        color: '#2c3e50',
                                                        wordBreak: 'break-word',
                                                        flex: 1,
                                                        lineHeight: '1.3'
                                                    }}>
                                                        📷 {file.name || 'Unknown File'}
                                                    </h4>
                                                    <span style={{
                                                        background: 'linear-gradient(135deg, #e9ecef, #dee2e6)',
                                                        padding: '4px 8px',
                                                        borderRadius: '8px',
                                                        fontSize: '12px',
                                                        fontWeight: 'bold',
                                                        color: '#495057',
                                                        marginLeft: '10px',
                                                        minWidth: 'fit-content'
                                                    }}>
                                                        {file.extension || 'none'}
                                                    </span>
                                                </div>
                                                
                                                {/* Image Display */}
                                                    <div style={{ position: 'relative', textAlign: 'center', marginBottom: '15px' }}>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openSlideShowAt(pageStartIndex + index);
                                                            }}
                                                            style={{
                                                                position: 'absolute',
                                                                top: '10px',
                                                                right: '10px',
                                                                zIndex: 2,
                                                                border: 'none',
                                                                borderRadius: '999px',
                                                                padding: '8px 12px',
                                                                background: 'rgba(15, 23, 42, 0.88)',
                                                                color: '#fff',
                                                                cursor: 'pointer',
                                                                fontSize: '12px',
                                                                fontWeight: '700',
                                                                boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
                                                            }}
                                                        >
                                                            ▶ Slide
                                                        </button>
                                                        <img 
                                                            src={`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/management/image/serve?path=${encodeURIComponent(file.path)}`}
                                                            alt={file.name}
                                                            style={{ 
                                                                width: '100%',
                                                                height: '200px',
                                                                objectFit: 'cover',
                                                                borderRadius: '8px',
                                                                border: '1px solid #dee2e6'
                                                            }}
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                e.target.nextSibling.style.display = 'flex';
                                                            }}
                                                        />
                                                        {/* Fallback when image fails to load */}
                                                        <div style={{
                                                            display: 'none',
                                                            width: '100%',
                                                            height: '200px',
                                                            backgroundColor: '#f8f9fa',
                                                            border: '2px dashed #dee2e6',
                                                            borderRadius: '8px',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: '#6c757d',
                                                            fontSize: '14px'
                                                        }}>
                                                            🖼️ Image not available
                                                        </div>
                                                </div>

                                                {/* File Information */}
                                                <div style={{
                                                    fontSize: '12px',
                                                    color: '#666',
                                                    textAlign: 'center',
                                                    padding: '10px',
                                                    backgroundColor: '#f8f9fa',
                                                    borderRadius: '8px'
                                                }}>
                                                    <div style={{ marginBottom: '5px' }}>
                                                        <strong>Size:</strong> {file.size ? 
                                                            file.size >= 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` :
                                                            file.size >= 1024 ? `${(file.size / 1024).toFixed(2)} KB` :
                                                            `${file.size} bytes` : 'Unknown'}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '10px',
                                                        color: '#888',
                                                        wordBreak: 'break-all'
                                                    }}>
                                                        {file.path}
                                                    </div>
                                                </div>

                                                {/* Quick Tag Buttons */}
                                                {quickTagButtons.length > 0 && (
                                                    <div style={{ marginTop: '14px' }}>
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            marginBottom: '8px'
                                                        }}>
                                                            <span style={{
                                                                fontSize: '12px',
                                                                fontWeight: '700',
                                                                color: '#495057'
                                                            }}>
                                                                Tag Buttons
                                                            </span>
                                                            <span style={{
                                                                fontSize: '11px',
                                                                color: '#6c757d'
                                                            }}>
                                                                click to add, or remove if already tagged
                                                            </span>
                                                        </div>
                                                        <div style={{
                                                            display: 'flex',
                                                            flexWrap: 'wrap',
                                                            gap: '8px'
                                                        }}>
                                                            {quickTagButtons.map((tag) => {
                                                                const alreadyTagged = hasTag(file, tag);
                                                                const isPending = Array.isArray(pendingTagMap[file.id]) && pendingTagMap[file.id].includes(tag);
                                                                return (
                                                                    <button
                                                                        key={`${file.id}-${tag}`}
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (alreadyTagged) {
                                                                                applyTagToCurrentFolder(tag, {
                                                                                    files: [file],
                                                                                    mode: 'remove',
                                                                                    silentNoop: true
                                                                                });
                                                                                return;
                                                                            }
                                                                            togglePendingTag(file.id, tag);
                                                                        }}
                                                                        style={{
                                                                            padding: '6px 10px',
                                                                            border: 'none',
                                                                            borderRadius: '999px',
                                                                            fontSize: '12px',
                                                                            fontWeight: '700',
                                                                            cursor: 'pointer',
                                                                            background: alreadyTagged
                                                                                ? 'linear-gradient(135deg, #d1d5db, #9ca3af)'
                                                                                : isPending
                                                                                    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                                                                    : 'linear-gradient(135deg, #0f766e, #14b8a6)',
                                                                            color: '#fff',
                                                                            opacity: alreadyTagged ? 0.7 : 1,
                                                                            boxShadow: alreadyTagged
                                                                                ? 'none'
                                                                                : isPending
                                                                                    ? '0 4px 10px rgba(245, 158, 11, 0.22)'
                                                                                    : '0 4px 10px rgba(20, 184, 166, 0.22)'
                                                                        }}
                                                                    >
                                                                        {alreadyTagged ? `✓ ${tag}` : isPending ? `● ${tag}` : tag}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Rename Checkbox and Input */}
                                                <div style={{ marginTop: '15px' }}>
                                                    <label style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        fontSize: '14px',
                                                        fontWeight: '500',
                                                        color: '#495057',
                                                        cursor: 'pointer'
                                                    }}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={checkedFiles[file.id] !== undefined}
                                                            onChange={(e) => handleCheck(file.id, e.target.checked)}
                                                            style={{ width: '16px', height: '16px' }}
                                                        />
                                                        Rename
                                                    </label>
                                                </div>

                                                {/* Rename Input */}
                                                {checkedFiles[file.id] !== undefined && (
                                                    <div style={{ marginTop: '10px' }}>
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
                                )}

                                {imageFiles && imageFiles.length > 0 && (
                                    <div style={{
                                        marginTop: '10px',
                                        textAlign: 'center',
                                        color: '#6c757d',
                                        fontSize: '13px',
                                        fontWeight: '600'
                                    }}>
                                        Showing {pageStartIndex + 1} - {Math.min(pageStartIndex + pageSize, imageFiles.length)} of {imageFiles.length} images
                                    </div>
                                )}

                                {Object.keys(pendingTagMap).length > 0 && (
                                    <div style={{
                                        marginTop: '16px',
                                        textAlign: 'center',
                                        padding: '16px 20px',
                                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                        borderRadius: '12px',
                                        border: '2px dashed #f59e0b'
                                    }}>
                                        <button
                                            type="button"
                                            onClick={applyPendingTags}
                                            style={{
                                                padding: '14px 28px',
                                                backgroundColor: '#f59e0b',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '10px',
                                                cursor: 'pointer',
                                                fontSize: '16px',
                                                fontWeight: 'bold',
                                                boxShadow: '0 4px 8px rgba(0,0,0,0.18)'
                                            }}
                                        >
                                            Apply Pending Tags
                                        </button>
                                        <div style={{
                                            marginTop: '10px',
                                            fontSize: '13px',
                                            color: '#7c2d12',
                                            fontWeight: '600'
                                        }}>
                                            {Object.values(pendingTagMap).reduce((count, tags) => count + tags.length, 0)} pending tag selections across {Object.keys(pendingTagMap).length} files
                                        </div>
                                    </div>
                                )}

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

                                <br />
                                
                                {/* Pagination Buttons */}
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage <= 1}
                                    style={{
                                        padding: '8px 12px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        background: currentPage <= 1
                                            ? 'linear-gradient(135deg, #ced4da, #adb5bd)'
                                            : 'linear-gradient(135deg, #007bff, #0056b3)',
                                        color: '#fff',
                                        fontWeight: '600',
                                        cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    ◀ Prev
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage >= totalPages}
                                    style={{
                                        padding: '8px 12px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        background: currentPage >= totalPages
                                            ? 'linear-gradient(135deg, #ced4da, #adb5bd)'
                                            : 'linear-gradient(135deg, #007bff, #0056b3)',
                                        color: '#fff',
                                        fontWeight: '600',
                                        cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Next ▶
                                </button>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {isSlideShowOpen && currentImageFile && (
                <div
                    onClick={closeSlideShow}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: isImageOnlyMode ? '#000' : 'rgba(0,0,0,0.85)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: isImageOnlyMode ? '100%' : 'min(1200px, 50%)',
                            maxHeight: isImageOnlyMode ? '100vh' : '90vh',
                            background: isImageOnlyMode ? '#000' : '#0f172a',
                            borderRadius: isImageOnlyMode ? '0' : '16px',
                            border: isImageOnlyMode ? 'none' : '1px solid rgba(255,255,255,0.15)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            height: isImageOnlyMode ? '100vh' : 'auto'
                        }}
                    >
                        {!isImageOnlyMode && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 16px',
                                background: 'rgba(255,255,255,0.06)',
                                color: '#fff'
                            }}>
                                <strong style={{ fontSize: '14px' }}>
                                    Slide {index + 1} / {imageFiles.length}
                                </strong>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={openImageOnlyMode}
                                        style={{
                                            border: 'none',
                                            background: 'rgba(255,255,255,0.2)',
                                            color: '#fff',
                                            borderRadius: '8px',
                                            padding: '6px 10px',
                                            cursor: 'pointer',
                                            fontWeight: '700'
                                        }}
                                    >
                                        Image Only
                                    </button>
                                    <button
                                        type="button"
                                        onClick={closeSlideShow}
                                        style={{
                                            border: 'none',
                                            background: 'rgba(255,255,255,0.2)',
                                            color: '#fff',
                                            borderRadius: '8px',
                                            padding: '6px 10px',
                                            cursor: 'pointer',
                                            fontWeight: '700'
                                        }}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            padding: '12px',
                            flex: 1,
                            minHeight: 0
                        }}>
                            {!isImageOnlyMode && (
                                <button
                                    type="button"
                                    onClick={prev}
                                    style={{
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '12px 14px',
                                        background: '#334155',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontWeight: '700'
                                    }}
                                >
                                    ◀ Prev
                                </button>
                            )}

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flex: 1,
                                height: '100%',
                                position: 'relative',
                                overflow: isImageOnlyMode ? 'hidden' : 'visible'
                            }}
                            onWheel={isImageOnlyMode ? handleImageOnlyWheel : undefined}
                            onMouseDown={isImageOnlyMode ? handlePanMouseDown : undefined}
                            onMouseMove={isImageOnlyMode ? handlePanMouseMove : undefined}
                            onMouseUp={isImageOnlyMode ? handlePanMouseUp : undefined}
                            onMouseLeave={isImageOnlyMode ? handlePanMouseUp : undefined}>
                                {isImageOnlyMode && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                exitImageOnlyMode();
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: '16px',
                                                left: '16px',
                                                zIndex: 2,
                                                border: 'none',
                                                borderRadius: '999px',
                                                padding: '10px 14px',
                                                background: 'rgba(15, 23, 42, 0.82)',
                                                color: '#fff',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                                fontWeight: '700',
                                                boxShadow: '0 6px 18px rgba(0,0,0,0.28)'
                                            }}
                                        >
                                            ← Back
                                        </button>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                prev();
                                            }}
                                            style={{
                                                position: 'absolute',
                                                left: '16px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                zIndex: 2,
                                                border: 'none',
                                                borderRadius: '999px',
                                                width: '54px',
                                                height: '54px',
                                                background: 'rgba(15, 23, 42, 0.72)',
                                                color: '#fff',
                                                cursor: 'pointer',
                                                fontSize: '22px',
                                                fontWeight: '700',
                                                boxShadow: '0 6px 18px rgba(0,0,0,0.28)'
                                            }}
                                        >
                                            ◀
                                        </button>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                next();
                                            }}
                                            style={{
                                                position: 'absolute',
                                                right: '16px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                zIndex: 2,
                                                border: 'none',
                                                borderRadius: '999px',
                                                width: '54px',
                                                height: '54px',
                                                background: 'rgba(15, 23, 42, 0.72)',
                                                color: '#fff',
                                                cursor: 'pointer',
                                                fontSize: '22px',
                                                fontWeight: '700',
                                                boxShadow: '0 6px 18px rgba(0,0,0,0.28)'
                                            }}
                                        >
                                            ▶
                                        </button>

                                        {/* Zoom controls */}
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '20px',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            zIndex: 2,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            background: 'rgba(15, 23, 42, 0.78)',
                                            borderRadius: '999px',
                                            padding: '6px 14px',
                                            boxShadow: '0 4px 14px rgba(0,0,0,0.35)'
                                        }}>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setZoomLevel(prev => Math.max(0.5, prev - 0.25)); }}
                                                style={{ border: 'none', background: 'transparent', color: '#fff', fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}
                                                title="Zoom out"
                                            >－</button>
                                            <span
                                                onClick={(e) => { e.stopPropagation(); setZoomLevel(1); }}
                                                style={{ color: '#cbd5e1', fontSize: '12px', minWidth: '42px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                                                title="Reset zoom"
                                            >{Math.round(zoomLevel * 100)}%</span>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setZoomLevel(prev => Math.min(5, prev + 0.25)); }}
                                                style={{ border: 'none', background: 'transparent', color: '#fff', fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}
                                                title="Zoom in"
                                            >＋</button>
                                        </div>
                                    </>
                                )}
                                <img
                                    src={`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/management/image/serve?path=${encodeURIComponent(currentImageFile.path)}`}
                                    alt={currentImageFile.name}
                                    onClick={isImageOnlyMode ? handleImageClick : undefined}
                                    style={{
                                        maxWidth: isImageOnlyMode ? 'none' : '100%',
                                        maxHeight: isImageOnlyMode ? 'none' : '72vh',
                                        objectFit: 'contain',
                                        borderRadius: isImageOnlyMode ? '0' : '12px',
                                        transform: isImageOnlyMode
                                            ? `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`
                                            : 'none',
                                        transformOrigin: 'center center',
                                        transition: isPanning ? 'none' : 'transform 0.15s ease',
                                        cursor: isImageOnlyMode ? (isPanning ? 'grabbing' : 'grab') : 'default',
                                        userSelect: 'none',
                                        pointerEvents: isImageOnlyMode ? 'auto' : 'auto'
                                    }}
                                />
                            </div>

                            {!isImageOnlyMode && (
                                <button
                                    type="button"
                                    onClick={next}
                                    style={{
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '12px 14px',
                                        background: '#334155',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontWeight: '700'
                                    }}
                                >
                                    Next ▶
                                </button>
                            )}
                        </div>

                        {!isImageOnlyMode && (
                            <div style={{
                                padding: '10px 16px',
                                color: '#cbd5e1',
                                fontSize: '13px',
                                background: 'rgba(255,255,255,0.04)',
                                wordBreak: 'break-all'
                            }}>
                                {currentImageFile.name}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default PictureViewerPage;