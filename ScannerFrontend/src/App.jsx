import Grainient from './components/Grainient';
import Navbar from './components/Navbar';
import SearchBar from './components/SearchBar';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>


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

      <div className="absolute inset-0 flex items-center justify-center z-40">
        <SearchBar />
      </div>

    </div>
  );
}

export default App;