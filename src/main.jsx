import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import SeguimientoPublico from './SeguimientoPublico.jsx'

// El link de seguimiento (/seguimiento/{token}) es PÚBLICO, sin
// login. Si la URL coincide con ese patrón, se muestra esa página
// directamente en vez de pedir usuario y contraseña.
function Raiz() {
  const coincidencia = window.location.pathname.match(/^\/seguimiento\/(.+)$/);
  if (coincidencia) {
    return <SeguimientoPublico token={coincidencia[1]} />;
  }
  return <App />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Raiz />
  </StrictMode>,
)