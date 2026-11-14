import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  fallbackTitle?: string;
  fallbackDescription?: string;
  onReset?: () => void;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected rendering error',
    };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught error:', error);
  }

  handleRecover = () => {
    this.setState({ hasError: false, errorMessage: '' });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[240px] flex flex-col items-center justify-center bg-[#111318] text-[#F2F4F7] p-6 text-center">
          <div className="max-w-md space-y-3 p-5 bg-[#1A2029] border border-white/15 rounded-lg">
            <AlertTriangle className="w-7 h-7 text-[#F07827] mx-auto" />
            <h2 className="font-display text-base font-semibold">
              {this.props.fallbackTitle || 'Component Encountered an Error'}
            </h2>
            <p className="text-xs text-[#9AA4B2] leading-relaxed">
              {this.props.fallbackDescription ||
                'Your project data remains safely stored. Try recovering the view below.'}
            </p>
            <p className="font-mono-tech text-[11px] text-[#9AA4B2] bg-[#111318] px-2.5 py-1.5 rounded border border-white/10 break-words">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={this.handleRecover}
              className="px-4 py-2 bg-[#F07827] hover:bg-[#ff8a3d] text-[#111318] text-xs font-semibold rounded-md inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Recover View
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
