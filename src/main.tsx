import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary';
import './index.css';

window.addEventListener('error', (e) => {
  console.error('[window.error]', e.error ?? e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[unhandledrejection]', e.reason);
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            colorPrimary: '#1f6feb',
            colorSuccess: '#22c55e',
            colorWarning: '#f59e0b',
            colorError: '#ef4444',
            colorInfo: '#3b82f6',
            borderRadius: 8,
            fontSize: 14,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Source Han Sans CN", "Microsoft YaHei", system-ui, sans-serif',
          },
          components: {
            Card: {
              borderRadiusLG: 12,
              boxShadowTertiary: '0 4px 16px rgba(15, 23, 42, 0.06)',
            },
            Tabs: {
              titleFontSize: 14,
              horizontalItemPadding: '8px 0',
            },
            Tag: {
              borderRadiusSM: 4,
            },
            Statistic: {
              titleFontSize: 13,
              contentFontSize: 22,
            },
          },
        }}
      >
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConfigProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
