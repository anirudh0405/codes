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
      <DialogContent className="sm:max-w-md p-6 bg-white border border-slate-200 shadow-2xl rounded-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight">
              Upload Clinical Report
            </DialogTitle>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <DialogDescription className="text-xs text-slate-500 mt-1 leading-relaxed">
            Upload a laboratory report or cardiac imaging report to automatically update the cardiovascular simulation.
          </DialogDescription>
        </DialogHeader>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Drop Zone / Interactive States */}
        <div className="py-2">
          {/* State 1 & 2: Empty or Drag-over */}
          {(uploadState === 'empty' || uploadState === 'drag-over') && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${uploadState === 'drag-over'
                ? 'border-blue-500 bg-blue-50/60 scale-[1.01]'
                : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                }`}
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
                <UploadCloud className="w-6 h-6" />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-800">
                  Drop your report here
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  or browse from your device
                </p>
              </div>

              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-white border border-slate-200 rounded-md px-2 py-0.5">
                  PDF • JPG • JPEG • PNG
                </span>
              </div>
            </div>
          )}

          {/* State 3: File Selected */}
          {uploadState === 'selected' && selectedFile && (
            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-4">
              <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {(selectedFile.size / 1024).toFixed(1)} KB · Ready to analyze
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed text-center">
                Click "Upload & Analyze" below to extract parameters via clinical OCR.
              </p>
            </div>
          )}

          {/* State 4: Processing */}
          {uploadState === 'processing' && (
            <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 text-center space-y-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto animate-spin">
                <RefreshCw className="w-5 h-5" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Analyzing Clinical Document
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {statusText || 'Extracting physiological and lab parameters...'}
                </p>
              </div>

              <div className="space-y-1.5 max-w-xs mx-auto">
                <Progress
                  value={progress}
                  max={100}
                  className="h-2 bg-slate-200"
                  indicatorClassName="bg-blue-600"
                />
                <span className="text-[11px] font-mono text-slate-400">
                  {progress}% complete
                </span>
              </div>
            </div>
          )}

          {/* State 5: Success */}
          {uploadState === 'success' && (
            <div className="border border-emerald-200 bg-emerald-50/30 rounded-2xl p-5 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Parameters Successfully Applied
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Extracted {extractedSummary.count} clinical values from{' '}
                  <span className="font-semibold">{selectedFile?.name}</span>.
                </p>
              </div>

              {extractedSummary.fields.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {extractedSummary.fields.map((field) => (
                    <Badge
                      key={field}
                      variant="outline"
                      className="text-[10px] bg-white text-emerald-800 border-emerald-200"
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
            <div className="border border-rose-200 bg-rose-50/30 rounded-2xl p-5 space-y-4 text-center">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-5 h-5" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Upload Error
                </h4>
                <p className="text-xs text-rose-600 mt-1">
                  {errorMessage || 'Failed to extract values automatically.'}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="text-xs bg-white border-slate-200"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>

        {/* Dialog Footer */}
        <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-2 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            className="text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50"
          >
            {uploadState === 'success' ? 'Close' : 'Cancel'}
          </Button>

          {uploadState === 'selected' && (
            <Button
              size="sm"
              onClick={handleStartUpload}
              className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              Upload & Analyze Report
            </Button>
          )}

          {uploadState === 'success' && (
            <Button
              size="sm"
              onClick={handleClose}
              className="text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
            >
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
