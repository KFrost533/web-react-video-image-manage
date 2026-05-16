/**  
    Function name: loadHeader
    Description: Dynamically loads the header HTML from an external file and inserts it into the document body.
    Returns: A promise that resolves to true if the header was loaded successfully, false otherwise.
*/
async function loadHeader() {
    try {
        const response = await fetch('assets/html/header.html');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const headerHTML = await response.text();
        
        // Insert header HTML into the body (first element)
        const headerContainer = document.createElement('div');
        headerContainer.innerHTML = headerHTML;
        document.body.insertBefore(headerContainer.firstElementChild, document.body.firstChild);
        
        return true;
    } catch (error) {
        console.error('Failed to load header:', error);
        return false;
    }
}

/**  
    Function name: loadFooter
    Description: Dynamically loads the footer HTML from an external file and inserts it into the document body.
    Returns: A promise that resolves to true if the footer was loaded successfully, false otherwise.
*/
async function loadFooter() {
    try {
        const response = await fetch('assets/html/footer.html');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const footerHTML = await response.text();

        // Insert footer HTML into the body (last element)
        const footerContainer = document.createElement('div');
        footerContainer.innerHTML = footerHTML;
        document.body.appendChild(footerContainer.firstElementChild);
        return true;
    } catch (error) {
        console.error('Failed to load footer:', error);
        return false;
    }
}

/**  
    Function name: titleCreator
    Description: Generates a page title based on the current filename.
    Returns: A formatted title string.
*/
function titleCreator() {     
    // get current filename without extension
    const pathname = window.location.pathname;
    const filename = pathname.split('/').pop().split('.')[0];
    
    // index.html ⇒ Home
    if (filename === 'index') {
        return 'Home';
    }
    
    // convert underscores, hyphens, and dots to spaces
    let title = filename.replace(/[_\-\.]/g, ' ');
    
    // first letter of each word to uppercase
    title = title.replace(/\b\w/g, char => char.toUpperCase());
    
    return title;
}

/* 
    Function name: setPageTitleAndHeader
    Description: Sets the document title, header h1, main section h2, and navigation active state based on the current page.
    Returns: None
*/
function setPageTitleAndHeader() {
    const pageTitle = titleCreator();
    
    // set document title
    document.title = pageTitle + ' - Project Documentation';
    
    // set h1 tag in header (if exists)
    const h1Element = document.querySelector('header h1');
    if (h1Element) {
        h1Element.textContent = pageTitle === 'Home' ? 'Video & Image Management Docs' : pageTitle;
    }
    
    // set h2 tag in main section (if exists)
    const mainH2 = document.querySelector('main section h2');
    if (mainH2) {
        mainH2.textContent = pageTitle;
    }
    
    // set active state in navigation
    const navLinks = document.querySelectorAll('nav a');
    const currentFile = window.location.pathname.split('/').pop() || 'index.html';
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentFile) {
            link.style.backgroundColor = 'rgba(255,255,255,0.3)';
            link.style.fontWeight = 'bold';
        }
    });
}

const cache = new Map();

/* 
    Function name: fetchwithCache
    Description: Fetches data from a URL with caching to avoid redundant network requests.
    Returns: The fetched data as text.
*/
async function fetchwithCache(url) {
    if (cache.has(url)) {
        return cache.get(url);
    }
    const response = await fetch(url);
    const data = await response.text();
    cache.set(url, data);
    return data;
}


/*    
    Function name: initializePage
    Description: Initializes the page by loading header and footer, and setting titles and navigation states.
    Returns: None
*/
async function initializePage() {
    // Check if header already exists (added directly in HTML)
    const existingHeader = document.querySelector('header');
    
    if (!existingHeader) {
        // Load header from external file only if not already present
        const headerLoaded = await loadHeader();
        
        if (headerLoaded) {
            // Set page title and header content after header is loaded
            setPageTitleAndHeader();
        }
    } else {
        // Header exists, just set title and navigation
        setPageTitleAndHeader();
    }
    
    // Load footer after header and main content are set
    await loadFooter();
}

// Automatically execute when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializePage);