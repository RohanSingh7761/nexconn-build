import SessionScreen from './components/SessionScreen'
import Spike from './Spike'

export default function App() {
  return import.meta.env.VITE_SPIKE ? <Spike /> : <SessionScreen />
}
