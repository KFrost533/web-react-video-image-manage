import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// folder management imports
import PictureViewerPage from './components/image/imageCheckUI';
import VideoCheckPage from './components/video/videoCheckUI';
import VideoDetailsPage from './components/video/videoDetailsUI';

function MediaHeader() {
    return (
        <header></header>
    );
}


export const routes = () => {
    return (
        <Router>
        <div style={{ width: '100%', minHeight: '100vh', margin: 0, padding: '16px', boxSizing: 'border-box', background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)' }}>
            <MediaHeader />
            <div style={{ width: '100%', margin: 0, padding: 0 }}>
                <Routes>
                    <Route path="/" element={<Navigate to="/file/video/list" replace />} />
                    <Route path="/file/video/list" element={<VideoCheckPage />} />
                    <Route path="/file/image/list" element={<PictureViewerPage />} />
                    <Route path="/file/picture/list" element={<Navigate to="/file/image/list" replace />} />
                    <Route path="/file/video/view/:fileId" element={<VideoDetailsPage />} />
                    <Route path="/file/image/view/:fileId" element={<VideoDetailsPage />} />
                    <Route path="*" element={<Navigate to="/file/video/list" replace />} />
                </Routes>
            </div>
        </div>
        </Router>
    );
};

export default routes;