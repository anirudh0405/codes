import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSimStore, UploadedReport } from '@/store/simStore';
import { parseReportFile } from '@/services/reportParser';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck,
  RefreshCw,
} from 'lucide-react';

interface ReportUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type UploadState = 'empty' | 'drag-over' | 'selected' | 'processing' | 'success' | 'error';

export function ReportUploadModal({ open, onOpenChange }: ReportUploadModalProps) {
  const [uploadState, setUploadState] = useState<UploadState>('empty');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [extractedSummary, setExtractedSummary] = useState<{
    count: number;
    fields: string[];
  }>({ count: 0, fields: [] });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const setUploadedReport = useSimStore((s) => s.setUploadedReport);
  const setReportFields = useSimStore((s) => s.setReportFields);

  // Handle Drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadState !== 'processing') {
      setUploadState('drag-over');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadState === 'drag-over') {
      setUploadState(selectedFile ? 'selected' : 'empty');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadState === 'processing') return;

    const file = e.dataTransfer.files?.[0];
    if (file && isValidFile(file)) {
      setSelectedFile(file);
      setUploadState('selected');
    } else {
      setErrorMessage('Please provide a valid PDF or image file (JPG, PNG).');
      setUploadState('error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isValidFile(file)) {
      setSelectedFile(file);
      setUploadState('selected');
      setErrorMessage('');
    }
  };

  const isValidFile = (file: File) => {
    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g)$/i.test(file.name);
    return isPdf || isImage;
  };

  // Perform parse using existing pipeline
  const handleStartUpload = async () => {
    if (!selectedFile) return;

    setUploadState('processing');
    setProgress(15);
    setStatusText('Reading clinical report and running OCR...');

    const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf');
    const fileUrl = URL.createObjectURL(selectedFile);
    const now = new Date();
    const timestamp =
      now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) +
      ' · ' +
      now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const initialReport: UploadedReport = {
      fileName: selectedFile.name,
      timestamp,
      fileUrl,
      fileType: isPdf ? 'pdf' : 'image',
      status: 'analyzing',
      analysisProgress: 15,
      analysisStatusText: 'Reading and analyzing clinical report...',
    };

    setUploadedReport(initialReport);

    try {
      const extracted = await parseReportFile(selectedFile, (p, text) => {
        setProgress(p);
        setStatusText(text);
        setUploadedReport({
          ...initialReport,
          analysisProgress: p,
          analysisStatusText: text,
        });
      });

      // Apply fields to existing Zustand store
      if (extracted.extractedCount > 0 || Object.keys(extracted.fields).length > 0) {
        setReportFields(extracted.fields);
      }

      setUploadedReport({
        ...initialReport,
        status: 'applied',
        extractedFields: extracted.fields,
        extractedCount: extracted.extractedCount,
        patientName: extracted.patientName,
        summaryNote: extracted.summaryNote,
        analysisProgress: 100,
        analysisStatusText: `✓ Auto-read ${extracted.extractedCount} values and applied to dashboard`,
      });

      // Extract field names for summary display
      const fieldNames = Object.keys(extracted.fields).map((k) => {
        if (k === 'totalCholesterol') return 'Total Cholesterol';
        if (k === 'systolic' || k === 'diastolic') return 'Blood Pressure';
        if (k === 'cac') return 'CAC Score';
        if (k === 'fai') return 'FAI Index';
        return k.toUpperCase();
      });

      setExtractedSummary({
        count: extracted.extractedCount,
        fields: Array.from(new Set(fieldNames)),
      });

      setProgress(100);
      setUploadState('success');
    } catch (err: any) {
      console.error('Report parse error:', err);
      setErrorMessage('Could not extract clinical parameters automatically.');
      setUploadState('error');
      setUploadedReport({
        ...initialReport,
        status: 'error',
        analysisStatusText: 'Failed to extract values automatically.',
      });
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadState('empty');
    setProgress(0);
    setStatusText('');
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      handleReset();
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="report-modal-content">
        {/* Header */}
        <div className="report-modal-header">
          <div>
            <h3 className="report-modal-title">
              Upload Clinical Report
            </h3>
            <p className="report-modal-desc">
              Upload a laboratory report or cardiac imaging report to automatically update the cardiovascular simulation.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="report-modal-close"
            aria-label="Close"
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {/* Interactive Drop Zone & States */}
        <div>
          {/* State 1 & 2: Empty or Drag-over */}
          {(uploadState === 'empty' || uploadState === 'drag-over') && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`report-modal-dropzone ${uploadState === 'drag-over' ? 'drag-over' : ''}`}
            >
              <div className="report-modal-icon-box">
                <UploadCloud style={{ width: 22, height: 22, strokeWidth: 1.9 }} />
              </div>

              <div>
                <p className="report-modal-drop-title">
                  Drop your report here
                </p>
                <p className="report-modal-drop-subtitle">
                  or <span className="report-modal-browse-link">browse from your device</span>
                </p>
              </div>

              <div className="report-modal-format-badge">
                <span>PDF</span>
                <span style={{ color: '#CBD5E1' }}>•</span>
                <span>JPG</span>
                <span style={{ color: '#CBD5E1' }}>•</span>
                <span>JPEG</span>
                <span style={{ color: '#CBD5E1' }}>•</span>
                <span>PNG</span>
              </div>
            </div>
          )}

          {/* State 3: File Selected */}
          {uploadState === 'selected' && selectedFile && (
            <div className="report-modal-file-card">
              <div className="report-modal-file-row">
                <div className="report-modal-file-icon">
                  <FileText style={{ width: 20, height: 20, strokeWidth: 1.8 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <p className="report-modal-file-name">
                    {selectedFile.name}
                  </p>
                  <p className="report-modal-file-meta">
                    {(selectedFile.size / 1024).toFixed(1)} KB · Ready to analyze
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="report-modal-close"
                  title="Remove file"
                >
                  <X style={{ width: 15, height: 15 }} />
                </button>
              </div>

              <p className="report-modal-file-note">
                Click <strong>"Upload & Analyze"</strong> below to extract parameters via clinical OCR.
              </p>
            </div>
          )}

          {/* State 4: Processing */}
          {uploadState === 'processing' && (
            <div className="report-modal-processing-box">
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: 'spin 1s linear infinite',
                }}
              >
                <RefreshCw style={{ width: 20, height: 20 }} />
              </div>

              <div>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: 0 }}>
                  Analyzing Clinical Document
                </h4>
                <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0 0' }}>
                  {statusText || 'Extracting physiological and lab parameters...'}
                </p>
              </div>

              <div style={{ width: '100%', maxWidth: 280, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Progress
                  value={progress}
                  max={100}
                  className="h-2 bg-slate-200"
                  indicatorClassName="bg-blue-600"
                />
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#94A3B8' }}>
                  {progress}% complete
                </span>
              </div>
            </div>
          )}

          {/* State 5: Success */}
          {uploadState === 'success' && (
            <div className="report-modal-success-box">
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  backgroundColor: '#DCFCE7',
                  color: '#16A34A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 style={{ width: 24, height: 24 }} />
              </div>

              <div>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: 0 }}>
                  Parameters Successfully Applied
                </h4>
                <p style={{ fontSize: 12, color: '#475569', margin: '4px 0 0 0' }}>
                  Extracted {extractedSummary.count} clinical values from{' '}
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{selectedFile?.name}</span>.
                </p>
              </div>

              {extractedSummary.fields.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', paddingTop: 4 }}>
                  {extractedSummary.fields.map((field) => (
                    <Badge
                      key={field}
                      variant="outline"
                      className="text-[10px] bg-white text-emerald-800 border-emerald-200 px-2 py-0.5"
                    >
                      ✓ {field}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* State 6: Error */}
          {uploadState === 'error' && (
            <div className="report-modal-error-box">
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: '#FFE4E6',
                  color: '#E11D48',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertCircle style={{ width: 22, height: 22 }} />
              </div>

              <div>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: 0 }}>
                  Upload Error
                </h4>
                <p style={{ fontSize: 12, color: '#E11D48', margin: '4px 0 0 0' }}>
                  {errorMessage || 'Failed to extract values automatically.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="report-modal-btn-cancel"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="report-modal-footer">
          <div className="report-modal-privacy">
            <span style={{ fontSize: 12 }}>🔒</span>
            <span>Private · Local client OCR</span>
          </div>

          <div className="report-modal-actions">
            <button
              type="button"
              onClick={handleClose}
              className="report-modal-btn-cancel"
            >
              {uploadState === 'success' ? 'Close' : 'Cancel'}
            </button>

            {uploadState === 'selected' && (
              <button
                type="button"
                onClick={handleStartUpload}
                className="report-modal-btn-primary"
              >
                Upload & Analyze
              </button>
            )}

            {uploadState === 'success' && (
              <button
                type="button"
                onClick={handleClose}
                className="report-modal-btn-done"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
