import './App.css'
import { PersonTable } from './person_natural/components'
import '@glideapps/glide-data-grid/dist/index.css'
import 'bootstrap/dist/css/bootstrap.min.css'

function App() {
    return (
        <div>
            <div className="cosmae-container">
                <div className="cosmae-header">CoSMA-E</div>
                <div className="cosmae-body">
                    <PersonTable />
                </div>
            </div>
            <div id="portal" />
        </div>
    )
}

export default App
