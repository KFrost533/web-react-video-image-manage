import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';

function VideoDetailsPage() {
    const { fileId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    
    // Get data passed from the previous page
    const { jsonPath, file } = location.state || {};
    
    // States
    const [fileDetails, setFileDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    // File rename state
    const [fileNameChange, setFileNameChange] = useState(false);
    const [afterfileName, setAfterFileName] = useState("");

    // Fetch file details when component mounts
    useEffect(() => {
        const fetchFileDetails = async () => {
            if (!fileId || !jsonPath) {
                setError('Missing file ID or JSON path');
                setIsLoading(false);
                return;
            }

            try {
                // to display file details from json file
                const res = await fetch(`http://localhost:5000/management/file/view/details?id=${fileId}&jsonPath=${encodeURIComponent(jsonPath)}`);
                if (!res.ok) {
                    console.error(`Error: ${res.status} ${res.statusText}`);
                    setError(`Failed to fetch file details: ${res.status} ${res.statusText}`);
                    return;
                }

                const json_file_details = await res.json();
                const file_info = json_file_details.file_info;

                setFileDetails(file_info);
                setAfterFileName(file_info.name);
                console.log("File Details:", json_file_details);
            } catch (err) {
                console.error(`Fetch error: ${err.message}`);
                setError(`Fetch error: ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFileDetails();
    }, [fileId, jsonPath]);

    // Handler for starting rename process
    const startRename = () => {
        setFileNameChange(true);
    };

    // Handler for executing file rename
    const executeRename = async () => {
        if (!fileDetails || !afterfileName.trim()) {
            setError('Please enter a valid file name');
            return;
        }

        try {
            // Extract folder path from full file path
            const folderPath = fileDetails.path.substring(0, fileDetails.path.lastIndexOf('\\'));
            console.log("Renaming file in folder:", folderPath);
            console.log(`Renaming file from ${fileDetails.name} to ${afterfileName}`);
            
            const res_changename = await fetch("http://localhost:5000/management/file/changename/single", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                    oldPath: folderPath + "\\" + fileDetails.name,
                    newPath: folderPath + "\\" + afterfileName 
                }),
            });

            if (!res_changename.ok) {
                setError(`Error: ${res_changename.status} ${res_changename.statusText}`);
                return;
            }

            const result = await res_changename.json();

            if (result.status === "success") {
                // Update file details with new name and path
                setFileDetails(prev => ({
                    ...prev,
                    name: afterfileName,
                    path: folderPath + "/" + afterfileName
                }));
                
                setFileNameChange(false);
                setError(null);
            } else {
                setError(`Rename failed: ${result.message}`);
            }

        } catch (err) {
            setError(`Rename error: ${err.message}`);
        }
    };

    // Handler for canceling rename
    const cancelRename = () => {
        if (fileDetails) {
            setAfterFileName(fileDetails.name);
        }
        setFileNameChange(false);
    };

    if (isLoading) {
        return (
            <div style={{ padding: '20px' }}>
                <h2>Loading file details...</h2>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '20px' }}>
                <h2>Error</h2>
                <p style={{ color: 'red' }}>{error}</p>
                <button onClick={() => navigate(-1)} style={{ padding: '8px 16px' }}>
                    ← Go Back
                </button>
            </div>
        );
    }

    if (!fileDetails) {
        return (
            <div style={{ padding: '20px' }}>
                <h2>File not found</h2>
                <button onClick={() => navigate(-1)} style={{ padding: '8px 16px' }}>
                    ← Go Back
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '20px' }}>
                <button 
                    onClick={() => navigate(-1)}
                    style={{ 
                        padding: '8px 16px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    ← Back to Folder List
                </button>
            </div>

            <div style={{ 
                padding: '20px', 
                border: '1px solid #ddd', 
                borderRadius: '8px',
                backgroundColor: '#f9f9f9'
            }}>
                <h1>File Details</h1>
                
                {/* File Details Table */}
                <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse', 
                    marginBottom: '20px',
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    textAlign: 'left'
                }}>
                    <tbody>
                        <tr>
                            <td style={{ 
                                padding: '12px', 
                                borderBottom: '1px solid #ddd', 
                                backgroundColor: '#f8f9fa',
                                fontWeight: 'bold',
                                width: '150px',
                                textAlign: 'left'
                            }}>
                                File ID
                            </td>
                            <td style={{ 
                                padding: '12px', 
                                borderBottom: '1px solid #ddd' 
                            }}>
                                {fileDetails.id}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ 
                                padding: '12px', 
                                borderBottom: '1px solid #ddd', 
                                backgroundColor: '#f8f9fa',
                                fontWeight: 'bold',
                                textAlign: 'left'
                            }}>
                                Name
                            </td>
                            <td style={{ 
                                padding: '12px', 
                                borderBottom: '1px solid #ddd',
                                wordBreak: 'break-word',
                                textAlign: 'left'
                            }}>
                                {fileDetails.name}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ 
                                padding: '12px', 
                                borderBottom: '1px solid #ddd', 
                                backgroundColor: '#f8f9fa',
                                fontWeight: 'bold',
                                textAlign: 'left'
                            }}>
                                Path
                            </td>
                            <td style={{ 
                                padding: '12px', 
                                borderBottom: '1px solid #ddd',
                                wordBreak: 'break-word',
                                fontSize: '0.9em',
                                color: '#666',
                                textAlign: 'left'
                            }}>
                                {fileDetails.path}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ 
                                padding: '12px', 
                                borderBottom: '1px solid #ddd', 
                                backgroundColor: '#f8f9fa',
                                fontWeight: 'bold',
                                textAlign: 'left'
                            }}>
                                Size
                            </td>
                            <td style={{ 
                                padding: '12px', 
                                borderBottom: '1px solid #ddd',
                                textAlign: 'left'
                            }}>
                                {/* Display size in appropriate units */}
                                {
                                fileDetails.size < 1024 && fileDetails.size > 1024 * 1024 ? (
                                    `${(fileDetails.size / 1024).toFixed(2)} KB`
                                ) : fileDetails.size >= 1024 * 1024 ? (
                                    `${(fileDetails.size / (1024 * 1024)).toFixed(2)} MB`
                                ) : fileDetails.size < 1024 * 1024 * 1024 ? (
                                    `${(fileDetails.size / (1024 * 1024 * 1024)).toFixed(2)} GB`
                                ) : (`${fileDetails.size >= 1024 * 1024 * 1024 * 1024 ? (
                                    `${(fileDetails.size / (1024 * 1024 * 1024 * 1024)).toFixed(2)} TB`
                                ) : null}`)}
                                
                                {/* Alternative display */}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ 
                                padding: '12px', 
                                borderBottom: '1px solid #ddd', 
                                backgroundColor: '#f8f9fa',
                                fontWeight: 'bold',
                                textAlign: 'left'
                            }}>
                                Extension
                            </td>
                            <td style={{ 
                                padding: '12px', 
                                borderBottom: '1px solid #ddd',
                                textAlign: 'left'
                            }}>
                                {fileDetails.extension || 'None'}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ 
                                padding: '12px', 
                                backgroundColor: '#f8f9fa',
                                fontWeight: 'bold',
                                textAlign: 'left'
                            }}>
                                Actions
                            </td>
                            <td style={{ 
                                padding: '12px',
                                textAlign: 'left'
                            }}>
                                {!fileNameChange ? (
                                    <button
                                        onClick={startRename}
                                        style={{ 
                                            padding: '12px 24px',
                                            backgroundColor: '#28a745',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Rename File
                                    </button>
                                ) : (
                                    <div style={{ 
                                        marginTop: '20px', 
                                        padding: '15px', 
                                        border: '2px solid #4CAF50', 
                                        borderRadius: '5px',
                                        backgroundColor: '#f0f8f0'
                                    }}>
                                        <h3>Rename File</h3>
                                        <p><strong>Current filename:</strong> {fileDetails.name}</p>
                                        
                                        <div style={{ marginBottom: '10px' }}>
                                            <label>New File Name:</label>
                                            <input 
                                                type="text" 
                                                value={afterfileName}
                                                onChange={(e) => setAfterFileName(e.target.value)}
                                                style={{ 
                                                    marginLeft: '10px', 
                                                    padding: '8px',
                                                    width: '300px',
                                                    borderRadius: '4px',
                                                    border: '1px solid #ccc'
                                                }}
                                                placeholder="Enter new filename"
                                            />
                                        </div>

                                        <button 
                                            onClick={executeRename}
                                            style={{ 
                                                padding: '8px 16px', 
                                                marginRight: '10px',
                                                backgroundColor: '#4CAF50',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Execute Rename
                                        </button>

                                        <button 
                                            onClick={cancelRename}
                                            style={{ 
                                                padding: '8px 16px',
                                                backgroundColor: '#f44336',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* video opening */}
                {(fileDetails.extension === 'mp4' || fileDetails.extension === '.mp4' || 
                  fileDetails.extension === 'avi' || fileDetails.extension === '.avi' ||
                  fileDetails.extension === 'mov' || fileDetails.extension === '.mov' ||
                  fileDetails.extension === 'wmv' || fileDetails.extension === '.wmv' ||
                  fileDetails.extension === 'flv' || fileDetails.extension === '.flv' ||
                  fileDetails.extension === 'webm' || fileDetails.extension === '.webm') && (
                    <div style={{ marginTop: '30px', textAlign: 'center' }}>
                        <h3 style={{
                            marginBottom: '20px',
                            color: '#333',
                            borderBottom: '2px solid #28a745',
                            paddingBottom: '10px',
                            display: 'inline-block'
                        }}>
                            Video Preview
                        </h3>
                        <video
                            controls
                            style={{
                                maxWidth: '100%',
                                maxHeight: '400px',
                                borderRadius: '4px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                        >
                            <source src={`http://localhost:5000/management/file/view/video?id=${fileDetails.id}&jsonPath=${encodeURIComponent(jsonPath)}`} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                )}

                {/* image opening */}
                {(fileDetails.extension === 'png' ||    fileDetails.extension === '.png' ||
                  fileDetails.extension === 'jpg' || fileDetails.extension === '.jpg' ||
                  fileDetails.extension === 'jpeg' || fileDetails.extension === '.jpeg' ||
                  fileDetails.extension === 'gif' || fileDetails.extension === '.gif' ||
                  fileDetails.extension === 'bmp' || fileDetails.extension === '.bmp' ||
                  fileDetails.extension === 'webp' || fileDetails.extension === '.webp' ||
                  fileDetails.extension === 'svg' || fileDetails.extension === '.svg') && (
                    <div style={{ marginTop: '30px', textAlign: 'center' }}>
                        <h3 style={{
                            marginBottom: '20px',
                            color: '#333',
                            borderBottom: '2px solid #28a745',
                            paddingBottom: '10px',
                            display: 'inline-block'
                        }}>
                            Image Preview
                        </h3>
                        <img 
                            src={`http://localhost:5000/management/file/view/image?id=${fileDetails.id}&jsonPath=${encodeURIComponent(jsonPath)}`}
                            alt={fileDetails.name}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '400px',
                                borderRadius: '4px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                        />
                    </div>
                )}

                {error && (
                    <div style={{ 
                        marginTop: '20px', 
                        padding: '10px', 
                        backgroundColor: '#f8d7da', 
                        color: '#721c24',
                        border: '1px solid #f5c6cb',
                        borderRadius: '4px'
                    }}>
                        {error}
                    </div>
                    )
                }
            </div>
        </div>
    );
}

export default VideoDetailsPage;