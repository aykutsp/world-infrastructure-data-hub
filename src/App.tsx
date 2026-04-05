import { useEffect, useState } from 'react';
import type { FeatureCollection } from 'geojson';
import InfraMap from './components/Map/InfraMap';
import Sidebar from './components/Dashboard/Sidebar';
import type {
  Country, Dataset, DatasetKey, ThemeType, TripResult, ViewMode,
} from './types';

function App() {
  const [data, setData] = useState<Dataset | null>(null);
  const [borders, setBorders] = useState<FeatureCollection | null>(null);
  const [activeDataset, setActiveDataset] = useState<DatasetKey>('fuel.gasoline');
  const [selected, setSelected] = useState<Country | null>(null);
  const [theme, setTheme] = useState<ThemeType>('system');
  const [view, setView] = useState<ViewMode>('explore');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [trip, setTrip] = useState<TripResult | null>(null);

  useEffect(() => {
    let effective = theme;
    if (theme === 'system') {
      effective = window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark';
    }
    document.documentElement.setAttribute('data-theme', effective);
  }, [theme]);

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    fetch(`${base}api/v1/countries.json`)
      .then((r) => r.json())
      .then((j: Dataset) => setData(j))
      .catch((e) => console.error('Failed to load dataset:', e));

    fetch(`${base}api/v1/countries.geojson`)
      .then((r) => r.json())
      .then((j: FeatureCollection) => setBorders(j))
      .catch((e) => console.error('Failed to load borders:', e));
  }, []);

  return (
    <div className="app-container">
      <Sidebar
        data={data}
        borders={borders}
        activeDataset={activeDataset}
        setActiveDataset={setActiveDataset}
        selected={selected}
        onSelect={setSelected}
        theme={theme}
        setTheme={setTheme}
        view={view}
        setView={setView}
        compareIds={compareIds}
        setCompareIds={setCompareIds}
        trip={trip}
        setTrip={setTrip}
      />
      <InfraMap
        data={data}
        borders={borders}
        activeDataset={activeDataset}
        selected={selected}
        onSelect={setSelected}
        theme={theme}
        view={view}
        compareIds={compareIds}
        trip={trip}
      />
    </div>
  );
}

export default App;
