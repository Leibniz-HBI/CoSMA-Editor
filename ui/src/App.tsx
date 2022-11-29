import './App.css';
import { PersonTable } from './person_natural/components';
import "@glideapps/glide-data-grid/dist/index.css";

function App() {
  return <div className="cosmae-container">
    <div className="cosmae-header">CoSMA-E</div>
    <div className="cosmae-body">
        <PersonTable />
    </div>
  </div>
}

export default App;
