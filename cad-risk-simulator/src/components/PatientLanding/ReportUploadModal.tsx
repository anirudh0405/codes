import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSimStore, UploadedReport } from '@/store/simStore';
import { parseReportFile } from '@/services/reportParser';
import {
  mergeExtractedReports,
  FIELD_LABELS,
  type ProcessedReportInput,
} from '@/services/multiReportMerger';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  RefreshCw,
  Plus,
} from 'lucide-react';

interface ReportUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface QueuedFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  format: 'pdf' | 'image' | 'text';
  status: 'pending' | 'processing' | 'success' | 'error';
  progress: number;
  statusText?: string;
  errorMessage?: string;
  reportDate?: string;
  facilityName?: string;
  result?: any;
}

export function ReportUploadModal({ open, onOpenChange }: ReportUploadModalProps) {
  const [items, setItems] = useState<QueuedFileItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);
  const [conflictResolutions, setConflictResolutions] = useState<Record<string, number>>({});
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const setUploadedReport = useSimStore((s) => s.setUploadedReport);
  const setUploadedReports = useSimStore((s) => s.setUploadedReports);
  const setReportFields = useSimStore((s) => s.setReportFields);
  const setReportConflicts = useSimStore((s) => s.setReportConflicts);

  const isValidFormat = (file: File) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name);
    const isText = file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');
    return isPdf || isImage || isText;
  };

  const getFormatType = (file: File): 'pdf' | 'image' | 'text' => {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf';
    if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) return 'text';
    return 'image';
  };

  // Add files to the queue with validation and duplicate prevention
  const addFiles = useCallback((incomingFiles: File[]) => {
    if (!incomingFiles || incomingFiles.length === 0) return;

    setDuplicateNotice(null);
    const newItems: QueuedFileItem[] = [];
    const duplicates: string[] = [];

    setItems((prevItems) => {
      const existingKeySet = new Set(prevItems.map((item) => `${item.name}-${item.size}`));

      for (const file of incomingFiles) {
        const key = `${file.name}-${file.size}`;
        if (existingKeySet.has(key)) {
          duplicates.push(file.name);
          continue;
        }
        existingKeySet.add(key);

        const format = getFormatType(file);

        if (file.size === 0) {
          newItems.push({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            name: file.name,
            size: file.size,
            format,
            status: 'error',
            progress: 0,
            errorMessage: 'Selected file is empty (0 bytes).',
          });
        } else if (!isValidFormat(file)) {
          newItems.push({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            name: file.name,
            size: file.size,
            format,
            status: 'error',
            progress: 0,
            errorMessage: 'Unsupported format. Supported formats are PDF, PNG, JPG, and TXT.',
          });
        } else {
          newItems.push({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            name: file.name,
            size: file.size,
            format,
            status: 'pending',
            progress: 0,
            statusText: 'Ready to analyze',
          });
        }
      }

      if (duplicates.length > 0) {
        setDuplicateNotice(
          duplicates.length === 1
            ? `"${duplicates[0]}" is already in the upload queue.`
            : `${duplicates.length} files were already in the queue and skipped.`
        );
      }

      return [...prevItems, ...newItems];
    });
  }, []);

  // Handle Drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessingBatch) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (isProcessingBatch) return;

    const droppedFiles = Array.from(e.dataTransfer.files || []);
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      addFiles(selectedFiles);
    }
    // Reset so same file can be re-selected if removed
    if (e.target) e.target.value = '';
  };

  // Remove an item from the queue
  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Process a single file item through the existing report parser pipeline
  const processItem = async (itemId: string, file: File) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, status: 'processing', progress: 15, statusText: 'Running OCR & extracting...' }
          : item
      )
    );

    try {
      const extracted = await parseReportFile(file, (p, text) => {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, progress: p, statusText: text }
              : item
          )
        );
      });

      if (extracted.extractedCount > 0 || Object.keys(extracted.fields).length > 0) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: 'success',
                  progress: 100,
                  statusText: `Extracted ${extracted.extractedCount} clinical values`,
                  result: extracted,
                  reportDate: extracted.reportDate,
                  facilityName: extracted.facilityName,
                }
              : item
          )
        );
      } else {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: 'error',
                  progress: 0,
                  errorMessage: 'No supported clinical parameters found in this file.',
                }
              : item
          )
        );
      }
    } catch (err: any) {
      console.error(`Report parse error for ${file.name}:`, err);
      const msg = err?.message || 'Could not extract parameters from this report.';
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: 'error',
                progress: 0,
                errorMessage: msg,
              }
            : item
        )
      );
    }
  };

  // Retry processing a failed file
  const handleRetryItem = async (id: string) => {
    const targetItem = items.find((i) => i.id === id);
    if (!targetItem) return;
    await processItem(targetItem.id, targetItem.file);
  };

  // Process all pending files
  const handleProcessAllPending = async () => {
    const pendingItems = items.filter((item) => item.status === 'pending');
    if (pendingItems.length === 0) return;

    setIsProcessingBatch(true);
    try {
      // Process each document independently through the existing pipeline
      for (const item of pendingItems) {
        await processItem(item.id, item.file);
      }
    } finally {
      setIsProcessingBatch(false);
    }
  };

  // Compute merged results across all successfully extracted reports
  const successfulItems = useMemo(() => {
    return items.filter((item) => item.status === 'success' && item.result);
  }, [items]);

  const processedInputs: ProcessedReportInput[] = useMemo(() => {
    return successfulItems.map((item) => ({
      fileName: item.name,
      result: item.result,
      reportDate: item.reportDate,
      facilityName: item.facilityName,
    }));
  }, [successfulItems]);

  const mergedData = useMemo(() => {
    if (processedInputs.length === 0) return null;
    return mergeExtractedReports(processedInputs, conflictResolutions);
  }, [processedInputs, conflictResolutions]);

  // Handle conflict choice selection
  const handleSelectConflictOption = (fieldKey: string, sourceIndex: number) => {
    setConflictResolutions((prev) => ({
      ...prev,
      [fieldKey]: sourceIndex,
    }));
  };

  // Apply merged results to the Arohan patient simulation state
  const handleApplyToPatient = () => {
    if (!mergedData || successfulItems.length === 0) return;

    // 1. Build individual UploadedReport entries for all processed documents
    const now = new Date();
    const timestamp =
      now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) +
      ' · ' +
      now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const individualReports: UploadedReport[] = successfulItems.map((item) => {
      const fileUrl = URL.createObjectURL(item.file);
      return {
        id: item.id,
        fileName: item.name,
        timestamp,
        fileUrl,
        fileType: item.format,
        reportDate: item.reportDate,
        facilityName: item.facilityName,
        extractedFields: item.result.fields,
        extractedCount: item.result.extractedCount,
        parameterDetails: item.result.parameterDetails,
        unmappedFields: item.result.unmappedFields,
        status: 'applied',
        patientName: item.result.patientName,
        patientId: item.result.patientId,
        summaryNote: item.result.summaryNote,
        analysisProgress: 100,
        analysisStatusText: `✓ ${item.result.extractedCount} values recognized`,
      };
    });

    // 2. Build the primary consolidated UploadedReport
    const primaryReportName =
      successfulItems.length === 1
        ? successfulItems[0].name
        : `${successfulItems.length} Reports Applied (${successfulItems.map((i) => i.name).join(', ')})`;

    const primaryReport: UploadedReport = {
      id: 'merged-report',
      fileName: primaryReportName,
      timestamp,
      fileUrl: URL.createObjectURL(successfulItems[0].file),
      fileType: successfulItems[0].format,
      status: 'applied',
      extractedFields: mergedData.mergedFields,
      extractedCount: mergedData.totalExtractedCount,
      parameterDetails: mergedData.parameterDetails,
      unmappedFields: mergedData.unmappedFields,
      patientName: mergedData.patientName,
      patientId: mergedData.patientId,
      summaryNote: mergedData.summaryNotes.join(' | '),
      analysisProgress: 100,
      analysisStatusText: `✓ Auto-read ${mergedData.totalExtractedCount} values from ${successfulItems.length} source report(s)`,
    };

    // 3. Synchronize with Zustand simulation store
    setReportFields(mergedData.mergedFields);
    setUploadedReport(primaryReport);
    setUploadedReports(individualReports);
    setReportConflicts(mergedData.conflicts);

    // 4. Close modal
    handleClose();
  };

  const handleReset = () => {
    setItems([]);
    setConflictResolutions({});
    setDuplicateNotice(null);
    setIsProcessingBatch(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      handleReset();
    }, 200);
  };

  const pendingCount = items.filter((i) => i.status === 'pending').length;
  const processingCount = items.filter((i) => i.status === 'processing').length;
  const successCount = items.filter((i) => i.status === 'success').length;
  const errorCount = items.filter((i) => i.status === 'error').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="report-modal-content">
        {/* Header */}
        <div className="report-modal-header">
          <div>
            <h3 className="report-modal-title">
              Upload Clinical Reports
            </h3>
            <p className="report-modal-desc">
              Upload one or more laboratory reports, vitals sheets, or cardiac imaging reports from different sources to automatically update the cardiovascular simulation.
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

        {/* Hidden Multi-File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />

        {/* Main Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* State 1: No files selected yet */}
          {items.length === 0 && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`report-modal-dropzone ${isDragOver ? 'drag-over' : ''}`}
            >
              <div className="report-modal-icon-box">
                <UploadCloud style={{ width: 22, height: 22, strokeWidth: 1.9 }} />
              </div>

              <div>
                <p className="report-modal-drop-title">
                  Drop your clinical reports here
                </p>
                <p className="report-modal-drop-subtitle">
                  Select multiple files at once or <span className="report-modal-browse-link">browse from your device</span>
                </p>
              </div>

              <div className="report-modal-format-badge">
                <span>PDF</span>
                <span style={{ color: '#CBD5E1' }}>•</span>
                <span>JPG</span>
                <span style={{ color: '#CBD5E1' }}>•</span>
                <span>PNG</span>
                <span style={{ color: '#CBD5E1' }}>•</span>
                <span>TXT</span>
              </div>
            </div>
          )}

          {/* State 2: One or more files in queue */}
          {items.length > 0 && (
            <>
              {/* Duplicate notice if user attempted to upload same file */}
              {duplicateNotice && (
                <div
                  style={{
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #FCD34D',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 12,
                    color: '#92400E',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />
                    <span>{duplicateNotice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDuplicateNotice(null)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#92400E' }}
                  >
                    <X style={{ width: 13, height: 13 }} />
                  </button>
                </div>
              )}

              {/* Add more button row */}
              <div className="report-modal-add-row">
                <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                  {items.length} {items.length === 1 ? 'Report' : 'Reports'} Selected
                  {successCount > 0 ? ` (${successCount} analyzed)` : ''}
                </span>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="report-modal-btn-add"
                  disabled={isProcessingBatch}
                >
                  <Plus style={{ width: 13, height: 13 }} />
                  <span>Add Another Report</span>
                </button>
              </div>

              {/* Queue List */}
              <div
                className="report-queue-container"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`report-queue-item ${item.status === 'error' ? 'error' : item.status === 'success' ? 'success' : ''}`}
                  >
                    <div className="report-queue-item-info">
                      <div className="report-modal-file-icon" style={{ width: 34, height: 34 }}>
                        <FileText style={{ width: 17, height: 17 }} />
                      </div>

                      <div className="report-queue-item-meta">
                        <p className="report-queue-item-title" title={item.name}>
                          {item.name}
                        </p>
                        <p className="report-queue-item-sub">
                          {(item.size / 1024).toFixed(1)} KB · {item.format.toUpperCase()}
                          {item.facilityName ? ` · ${item.facilityName}` : ''}
                          {item.reportDate ? ` · ${item.reportDate}` : ''}
                        </p>

                        {/* Individual progress bar during extraction */}
                        {item.status === 'processing' && (
                          <div style={{ marginTop: 4 }}>
                            <Progress
                              value={item.progress}
                              max={100}
                              className="h-1.5 bg-slate-200"
                              indicatorClassName="bg-blue-600"
                            />
                            <span style={{ fontSize: 10, color: '#64748B' }}>
                              {item.statusText || `${item.progress}% complete`}
                            </span>
                          </div>
                        )}

                        {/* Error message */}
                        {item.status === 'error' && (
                          <span style={{ fontSize: 11, color: '#DC2626', display: 'block', marginTop: 2 }}>
                            ⚠ {item.errorMessage}
                          </span>
                        )}

                        {/* Success summary */}
                        {item.status === 'success' && item.result && (
                          <span style={{ fontSize: 11, color: '#16A34A', display: 'block', marginTop: 2 }}>
                            ✓ {item.result.extractedCount} values extracted
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions on file item */}
                    <div className="report-queue-item-actions">
                      {item.status === 'pending' && (
                        <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">
                          Ready
                        </Badge>
                      )}

                      {item.status === 'processing' && (
                        <div style={{ animation: 'spin 1s linear infinite', color: '#2563EB', display: 'flex' }}>
                          <RefreshCw style={{ width: 14, height: 14 }} />
                        </div>
                      )}

                      {item.status === 'error' && (
                        <button
                          type="button"
                          onClick={() => handleRetryItem(item.id)}
                          className="report-modal-close"
                          title="Retry this file"
                          style={{ color: '#2563EB', backgroundColor: '#EFF6FF' }}
                        >
                          <RefreshCw style={{ width: 14, height: 14 }} />
                        </button>
                      )}

                      {!isProcessingBatch && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="report-modal-close"
                          title="Remove file"
                        >
                          <X style={{ width: 14, height: 14 }} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Conflict Resolution Section */}
              {mergedData && mergedData.conflicts.length > 0 && (
                <div className="report-conflict-box">
                  <div className="report-conflict-header">
                    <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} />
                    <span>
                      Discrepancies Detected Across Reports ({mergedData.conflicts.length})
                    </span>
                  </div>

                  <p style={{ fontSize: 11.5, color: '#92400E', margin: 0 }}>
                    Different reports contain differing values for the same biomarkers. Please review and select which measurement to apply to the active assessment:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {mergedData.conflicts.map((conflict) => {
                      const selectedIdx = conflictResolutions[conflict.fieldKey];

                      return (
                        <div key={conflict.fieldKey} className="report-conflict-item">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="report-conflict-item-title">
                              {conflict.parameter}
                            </span>
                            {selectedIdx === undefined && (
                              <span style={{ fontSize: 10, color: '#DC2626', fontWeight: 600 }}>
                                Selection required
                              </span>
                            )}
                          </div>

                          <div className="report-conflict-options">
                            {conflict.sources.map((src, idx) => {
                              const isSelected = selectedIdx === idx;
                              return (
                                <div
                                  key={`${src.sourceFile}-${idx}`}
                                  className={`report-conflict-option ${isSelected ? 'selected' : ''}`}
                                  onClick={() => handleSelectConflictOption(conflict.fieldKey, idx)}
                                >
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <input
                                        type="radio"
                                        name={`conflict-${conflict.fieldKey}`}
                                        checked={isSelected}
                                        onChange={() => handleSelectConflictOption(conflict.fieldKey, idx)}
                                        style={{ cursor: 'pointer' }}
                                      />
                                      <span style={{ fontWeight: 600 }}>
                                        {src.sourceFacility || src.sourceFile}
                                      </span>
                                    </div>
                                    <span style={{ fontSize: 10.5, color: '#64748B', marginLeft: 18 }}>
                                      {src.sourceDate ? `Date: ${src.sourceDate}` : 'No date specified'}
                                      {src.sourcePage ? ` · Page ${src.sourcePage}` : ''}
                                      {src.sourceFacility && src.sourceFacility !== src.sourceFile ? ` (${src.sourceFile})` : ''}
                                    </span>
                                  </div>

                                  <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 12 }}>
                                    {String(src.value)} {src.unit || ''}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Combined Extracted Parameters Summary */}
              {mergedData && mergedData.totalExtractedCount > 0 && (
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 10,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>
                      Combined Clinical Parameters ({mergedData.totalExtractedCount})
                    </span>
                    {mergedData.patientName && (
                      <span style={{ fontSize: 11, color: '#64748B' }}>
                        Patient: <strong>{mergedData.patientName}</strong>
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 110, overflowY: 'auto' }}>
                    {mergedData.parameterDetails.map((pd) => (
                      <Badge
                        key={`${pd.fieldKey}-${pd.sourceFile}`}
                        variant="outline"
                        className="text-[10.5px] bg-white text-emerald-800 border-emerald-200 px-2 py-0.5"
                      >
                        ✓ {pd.parameter}: {String(pd.value)} {pd.unit || ''}
                        {pd.sourceFile ? ` (${pd.sourceFile})` : ''}
                      </Badge>
                    ))}
                  </div>

                  {mergedData.unmappedFields.length > 0 && (
                    <span style={{ fontSize: 10.5, color: '#64748B' }}>
                      Unmapped tests identified: {mergedData.unmappedFields.join(', ')}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="report-modal-footer">
          <div className="report-modal-privacy">
            <span style={{ fontSize: 12 }}>🔒</span>
            <span>Private · Local client OCR & processing</span>
          </div>

          <div className="report-modal-actions">
            <button
              type="button"
              onClick={handleClose}
              className="report-modal-btn-cancel"
            >
              {successCount > 0 ? 'Cancel' : 'Close'}
            </button>

            {/* "Upload & Analyze" button when pending files exist */}
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={handleProcessAllPending}
                disabled={isProcessingBatch}
                className="report-modal-btn-primary"
              >
                {isProcessingBatch
                  ? 'Analyzing...'
                  : pendingCount === 1
                    ? 'Upload & Analyze'
                    : `Upload & Analyze All (${pendingCount})`}
              </button>
            )}

            {/* "Apply to Patient Assessment" when at least one report succeeded */}
            {successCount > 0 && pendingCount === 0 && (
              <button
                type="button"
                onClick={handleApplyToPatient}
                className="report-modal-btn-done"
              >
                Apply to Patient Assessment ({successCount})
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
