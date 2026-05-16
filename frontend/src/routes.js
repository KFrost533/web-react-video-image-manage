import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";

// folder management imports
import PictureViewerPage from './components/image/imageCheckUI';
import VideoCheckPage from './components/video/videoCheckUI';
import VideoDetailsPage from './components/video/videoDetailsUI';

function MediaHeader() {
    const navigate = useNavigate();
    const location = useLocation();
    const isVideoActive = location.pathname.startsWith('/file/video');
    const isImageActive = location.pathname.startsWith('/file/image');

    const tabStyle = (active, accent) => ({
        padding: '12px 18px',
        border: 'none',
        borderRadius: '999px',
        cursor: 'pointer',
        fontSize: '15px',
        fontWeight: '700',
        color: '#fff',
        background: active ? accent : 'rgba(255,255,255,0.14)',
        boxShadow: active ? '0 8px 18px rgba(0,0,0,0.18)' : 'none',
        transition: 'transform 0.2s ease, background 0.2s ease'
    });

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