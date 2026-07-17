import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SessionsPage from "@/pages/SessionsPage";
import NewSessionPage from "@/pages/NewSessionPage";
import SetupPage from "@/pages/SetupPage";
import BoardPage from "@/pages/BoardPage";
import ExportPage from "@/pages/ExportPage";
import ToastViewport from "@/components/ToastViewport";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SessionsPage />} />
        <Route path="/sessions/new" element={<NewSessionPage />} />
        <Route path="/sessions/:id/setup" element={<SetupPage />} />
        <Route path="/sessions/:id/board" element={<BoardPage />} />
        <Route path="/sessions/:id/export" element={<ExportPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastViewport />
      <ConfirmDialog />
    </Router>
  );
}
