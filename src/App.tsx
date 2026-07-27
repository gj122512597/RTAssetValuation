import { Routes, Route, Navigate } from 'react-router-dom';
import NewAssetValuationPage from './pages/NewAssetValuationPage';
import ModelingIntroPage from './pages/ModelingIntroPage';
import HomePage from './pages/HomePage';
import AssetDetailPage from './pages/AssetDetailPage';
import IntelPage from './pages/IntelPage';
import DueDiligenceCenter from './pages/DueDiligenceCenter';
import DueDiligenceNewPage from './pages/DueDiligenceNewPage';
import DueDiligenceIntakePage from './pages/DueDiligenceIntakePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/asset/:id" element={<AssetDetailPage />} />
      <Route path="/intel" element={<IntelPage />} />
      <Route path="/due-diligence" element={<DueDiligenceCenter />} />
      <Route path="/due-diligence/new" element={<DueDiligenceNewPage />} />
      <Route path="/due-diligence/:id" element={<DueDiligenceIntakePage />} />
      <Route path="/valuation/new" element={<NewAssetValuationPage />} />
      <Route path="/modeling-intro" element={<ModelingIntroPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}