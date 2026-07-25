import { Component, type ReactNode } from 'react';
import { Alert, Button } from 'antd';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // eslint-disable-next-line no-console
    console.error('React render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="max-w-xl w-full">
            <Alert
              type="error"
              showIcon
              message="页面出现运行时错误"
              description={
                <div className="space-y-2">
                  <div className="font-mono text-xs text-red-700 whitespace-pre-wrap break-all">
                    {this.state.error.message}
                  </div>
                  <div className="font-mono text-[11px] text-gray-500 whitespace-pre-wrap break-all max-h-40 overflow-auto">
                    {this.state.error.stack?.slice(0, 800)}
                  </div>
                </div>
              }
            />
            <div className="mt-4 flex gap-2">
              <Button onClick={() => location.reload()}>刷新页面</Button>
              <Button onClick={() => this.setState({ error: null })}>尝试恢复</Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
