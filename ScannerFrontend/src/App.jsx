import { useState } from 'react';

import Grainient from './components/Grainient';
import Navbar from './components/Navbar';
import ScanResults from './components/results/ScanResults';
import SearchBar from './components/SearchBar';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

function App() {
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  async function scanWebsite(url) {
    setIsScanning(true);
    setError('');
    setScanResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const payload = await response.json().catch(() => ({
        success: false,
        message: 'Unexpected response from scanner.',
      }));

      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message || payload.message || 'Scan failed');
      }

      setScanResult(payload);
    } catch (scanError) {
      setError(scanError.message || 'Unable to scan this website right now.');
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">


      <Grainient
        color1="#00000026"
        color2="#000000"
        color3="#000000"
        timeSpeed={0.25}
        colorBalance={0}
        warpStrength={1}
        warpFrequency={5}
        warpSpeed={2}
        warpAmplitude={50}
        blendAngle={0}
        blendSoftness={0.05}
        rotationAmount={500}
        noiseScale={2}
        grainAmount={0.1}
        grainScale={2}
        grainAnimated={false}
        contrast={1.5}
        gamma={1}
        saturation={1}
        centerX={0}
        centerY={0}
        zoom={0.9}
      />


      <Navbar />

      <div className="absolute inset-0 z-40 overflow-y-auto px-6 pb-10 pt-32">
        <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col items-center justify-center gap-6">
          <SearchBar onSubmit={scanWebsite} isScanning={isScanning} />

          <ScanResults result={scanResult} isScanning={isScanning} error={error} />
        </main>
      </div>

    </div>
  );
}

export default App;
