import React, { useState, useEffect } from 'react';
function App() {
  const [status, setStatus] = useState("");

  const handleSync = () => {
    setStatus("Syncing...");
    setTimeout(() => setStatus("Synced!"), 1000);
  };

  return (
    <div className="w-64 h-auto bg-zinc-900 text-white p-4">
      <h1 className="text-xl font-bold mb-4">OpenCourse</h1>
      <div className="flex flex-col gap-3">
        <a 
          href="http://localhost:5173" 
          target="_blank" 
          rel="noreferrer"
          className="bg-blue-600 hover:bg-blue-700 text-center py-2 rounded-md font-semibold"
        >
          Go to Dashboard
        </a>
        <button 
          onClick={handleSync}
          className="bg-zinc-700 hover:bg-zinc-600 py-2 rounded-md border border-zinc-600"
        >
          {status === "" ? "Force Sync" : status}
        </button>
      </div>
    </div>
  );
}

export default App;