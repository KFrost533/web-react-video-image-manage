const BaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'

export async function apiGet(path) {
    const response = await fetch(`${BaseUrl}${path}`);
    
    if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}

export async function apiPost(path, bodyData) {
    const response = await fetch(`${BaseUrl}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyData),
    });
    if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}