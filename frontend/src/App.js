import React from 'react';

// path imports
import routes from './routes';


function App() {
  const [showLogs, setShowLogs] = React.useState(false);

  return (
    <>
      {routes()}
      {/* Header */}
      <div style={{ textAlign: 'center' }}>

          {/* Log Viewer Toggle */}
          <br />
          <div>
            <label>
              <input type="checkbox"
                checked={showLogs}
                onChange ={(e) => setShowLogs(e.target.checked)}
              /> Enable Logging
            </label>
          </div>
      </div>
    </>
  );
}

export default App;