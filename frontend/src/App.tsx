import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import TitlePage from "./pages/TitlePage";
import PlayerPage from "./pages/PlayerPage";
import ActorPage from "./pages/ActorPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/title/:type/:id" element={<TitlePage />} />
      <Route path="/play/:type/:id" element={<PlayerPage />} />
      <Route path="/play/tv/:id/:season/:episode" element={<PlayerPage />} />
      <Route path="/actor/:id" element={<ActorPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
