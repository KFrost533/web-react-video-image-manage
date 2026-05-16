import { useEffect, useState} from 'react';

function LogViewer() {

    const [logData, setLogData] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => { 
        async function fetchLogs() {
            try {
                const res = await fetch(`http://localhost:5000/log/viewer`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                })
                console.log("Fetch response:", res);

                if (!res.ok) {
                    setError(`Error: ${res.status} ${res.statusText}`);
                    return;
                }
                
                const res_data = await res.json();
                const log = res_data.log
                setLogData(log);

            } catch (err) {
                setError(`Fetch error: ${err.message}`);
            }
        }
        fetchLogs();
    }, []);

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'success':
                return '#4CAF50';
            case 'error':
                return '#f44336';
            case 'warning':
                return '#ff9800';
            case 'info':
                return '#2196F3';
            default:
                return '#9E9E9E';
        }
    };

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // Filter states
    const [QueryString, setQueryString] = useState('');
    const [QueryTime, setQueryTime] = useState('');
    const [QueryStatus, setQueryStatus] = useState('');
    const [QueryExecute, setQueryExecute] = useState(false);

    useEffect(() => {
        async function fetchFilteredLogs() {
            try {
                const res = await fetch(`http://localhost:5000/log/query`, {
                    method: 'POST',
                    body: JSON.stringify({
                        Log: logData,
                        Time: QueryTime,
                        Status: QueryStatus,
                        Query_string: QueryString
                    }),
                    headers: {
                        'Content-Type': 'application/json',
                    }   
                })
                console.log("Fetch response:", res);
                if (!res.ok) {
                    setError(`Error: ${res.status} ${res.statusText}`);
                    return;
                }
                
                const res_data = await res.json();
                const log = res_data.log
                setLogData(log);
            } catch (err) {
                setError(`Fetch error: ${err.message}`);
            }
        }

        if (QueryExecute) {
            fetchFilteredLogs();
            setQueryExecute(false);
        }
    }, [QueryExecute]);

    return (
        <div style={{ 
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            maxWidth: '100%',
            margin: '0 auto',
            padding: '20px'
        }}>
            <h2 style={{ 
                marginBottom: '24px', 
                color: '#1a202c',
                fontSize: '24px',
                fontWeight: '600'
            }}>
                Log Viewer
            </h2>

            {error && (
                <div style={{ 
                    color: '#e53e3e', 
                    backgroundColor: '#fed7d7', 
                    padding: '16px 20px', 
                    margin: '0 0 20px 0',
                    borderRadius: '8px',
                    border: '1px solid #feb2b2',
                    fontWeight: '500'
                }}>
                    {error}
                </div>
            )}
            
            <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: '#ffffff',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}>
                {logData.length > 0 ? (
                    <>
                        <input type="text" placeholder="Search logs..." style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: 'none',
                            borderBottom: '1px solid #e2e8f0',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }} onChange={(e) => setQueryString(e.target.value)} 
                        />

                        <div> Search Query: {QueryString} </div>
                        
                        <input type="text" placeholder="Filter by Time (YYYY-MM-DD HH:MM:SS)" style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: 'none',
                            borderBottom: '1px solid #e2e8f0',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box'
                            }} onChange={(e) => setQueryTime(e.target.value)} 
                        />
                        <div>Filter by Time: {QueryTime}</div>

                        <input type="text" placeholder="Filter by Status (success, error, warning, info)" style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: 'none', 
                            borderBottom: '1px solid #e2e8f0',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box'
                            }} onChange={(e) => setQueryStatus(e.target.value)} 
                        />
                        <div>Filter by Status: {QueryStatus}</div>

                        <button style={{
                            margin: '12px',
                            padding: '10px 16px',
                            backgroundColor: '#3182ce',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600'
                        }} onClick={async () => setQueryExecute(true)}>
                            Apply Filters
                        </button>
                    </>
                ) : null}

                {logData.length > 0 ? (
                    <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse',
                        fontSize: '14px'
                    }}>
                        <thead>
                            <tr style={{ 
                                backgroundColor: '#f7fafc',
                                borderBottom: '2px solid #e2e8f0'
                            }}>
                                <th style={{ 
                                    padding: '16px 20px',
                                    textAlign: 'left',
                                    fontWeight: '600',
                                    color: '#4a5568',
                                    fontSize: '13px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    width: '60px'
                                }}>
                                    Status
                                </th>
                                <th style={{ 
                                    padding: '16px 20px',
                                    textAlign: 'left',
                                    fontWeight: '600',
                                    color: '#4a5568',
                                    fontSize: '13px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    width: '180px'
                                }}>
                                    Script Name
                                </th>
                                <th style={{ 
                                    padding: '16px 20px',
                                    textAlign: 'left',
                                    fontWeight: '600',
                                    color: '#4a5568',
                                    fontSize: '13px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    width: '180px'
                                }}>
                                    TimeStamp
                                </th>
                                <th style={{ 
                                    padding: '16px 20px',
                                    textAlign: 'left',
                                    fontWeight: '600',
                                    color: '#4a5568',
                                    fontSize: '13px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Message
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {logData.map((line, index) => (
                                <tr 
                                    key={index} 
                                    style={{ 
                                        borderBottom: index < logData.length - 1 ? '1px solid #e2e8f0' : 'none',
                                        transition: 'background-color 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#f7fafc';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                width: '10px',
                                                height: '10px',
                                                borderRadius: '50%',
                                                backgroundColor: getStatusColor(line.status),
                                                flexShrink: 0
                                            }}></div>
                                            <span style={{
                                                fontSize: '12px',
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                backgroundColor: getStatusColor(line.status),
                                                color: '#ffffff',
                                                fontWeight: '600',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}>
                                                {line.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ 
                                        padding: '16px 20px', 
                                        verticalAlign: 'top',
                                        fontWeight: '500',
                                        color: '#2d3748'
                                    }}>
                                        {line.script_name}
                                    </td>
                                    <td style={{ 
                                        padding: '16px 20px', 
                                        verticalAlign: 'top',
                                        fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
                                        color: '#718096',
                                        fontSize: '13px'
                                    }}>
                                        {formatTimestamp(line.timestamp)}
                                    </td>
                                    <td style={{ 
                                        padding: '16px 20px', 
                                        verticalAlign: 'top',
                                        fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
                                        color: '#2d3748',
                                        fontSize: '13px',
                                        lineHeight: '1.6',
                                        maxWidth: '400px',
                                        wordBreak: 'break-word',
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {line.message}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    !error && (
                        <div style={{ 
                            padding: '60px 20px', 
                            textAlign: 'center',
                            color: '#718096'
                        }}>
                            <div style={{ 
                                fontSize: '48px',
                                marginBottom: '16px'
                            }}>
                                📄
                            </div>
                            <div style={{
                                fontSize: '16px',
                                fontWeight: '500'
                            }}>
                                Loading Logs...
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

export default LogViewer;