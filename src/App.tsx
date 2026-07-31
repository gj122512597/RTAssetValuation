import { Routes, Route, Navigate } from 'react-router-dom';
import NewAssetValuationPage from './pages/NewAssetValuationPage';
import ModelingIntroPage from './pages/ModelingIntroPage';
import HomePage from './pages/HomePage';
import AssetDetailPage from './pages/AssetDetailPage';
import IntelPage from './pages/IntelPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/asset/:id" element={<AssetDetailPage />} />
      <Route path="/intel" element={<IntelPage />} />
      <Route path="/valuation/new" element={<NewAssetValuationPage />} />
      <Route path="/modeling-intro" element={<ModelingIntroPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}