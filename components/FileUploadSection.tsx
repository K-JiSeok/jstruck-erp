'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2, Trash2, FileText, Download, X, ImageOff } from 'lucide-react';
import { VehicleFile, VehicleFileType, VEHICLE_FILE_LABEL } from '@/lib/types';
import { deleteVehicleFile, uploadVehicleFile } from '@/lib/storage';
import { compressImageToFile } from '@/lib/image';

function isImageUrl(url: string) {
  return /\.(jpe?g|png|gif|webp|bmp)(\?.*)?$/i.test(url);
}

// 브라우저(특히 모바일)에서 다른 도메인의 파일도 실제로 "다운로드"(사진첩 저장)되도록
// fetch로 받아 blob URL을 만들어 저장을 트리거한다.
async function forceDownload(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } catch {
    window.open(url, '_blank');
  }
}

function PreviewModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X size={22} />
      </button>
      <img
        src={src}
        alt="미리보기"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl"
      />
    </div>
  );
}

export default function FileUploadSection({
  vehicleId,
  fileType,
  files,
  uploadedBy,
  onChanged,
  accept = 'image/*,application/pdf',
  gridPreview = false,
  fillHeight = false,
}: {
  vehicleId: string;
  fileType: VehicleFileType;
  files: VehicleFile[];
  uploadedBy?: string;
  onChanged: () => void;
  accept?: string;
  gridPreview?: boolean;
  fillHeight?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const isPhoto = fileType === 'photo';

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;
    setUploading(true);
    const failures: string[] = [];

    for (const original of Array.from(selected)) {
      try {
        // 사진은 캔버스로 다시 인코딩해서 올린다 (원본 포맷 문제로 깨져 보이는 것 방지 + 용량 절감)
        const toUpload = isPhoto ? await compressImageToFile(original) : original;
        await uploadVehicleFile(vehicleId, fileType, toUpload, uploadedBy);
      } catch (err: any) {
        failures.push(`${original.name}: ${err?.message ?? '알 수 없는 오류'}`);
      }
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
    onChanged();

    if (failures.length > 0) {
      alert(
        `${failures.length}개 파일 업로드에 실패했습니다.\n\n${failures.join(
          '\n'
        )}\n\n(Supabase Storage 버킷 접근 권한을 확인해주세요)`
      );
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('이 파일을 삭제할까요?')) return;
    await deleteVehicleFile(id);
    onChanged();
  }

  async function handleDeleteAll() {
    if (files.length === 0) return;
    if (!confirm(`${VEHICLE_FILE_LABEL[fileType]} ${files.length}개를 전체 삭제할까요? 되돌릴 수 없습니다.`))
      return;
    setDeletingAll(true);
    try {
      for (const f of files) {
        await deleteVehicleFile(f.id);
      }
      onChanged();
    } finally {
      setDeletingAll(false);
    }
  }

  function filenameFor(f: VehicleFile, index?: number) {
    const ext = f.file_url.split('.').pop()?.split('?')[0] || 'jpg';
    const suffix = index !== undefined ? `_${index + 1}` : `_${f.id.slice(0, 6)}`;
    return `${VEHICLE_FILE_LABEL[f.file_type]}${suffix}.${ext}`;
  }

  function handlePreview(f: VehicleFile) {
    if (isImageUrl(f.file_url)) {
      setPreviewSrc(f.file_url);
    } else {
      // PDF 등은 새 탭에서 브라우저 자체 뷰어로 열어 확인
      window.open(f.file_url, '_blank');
    }
  }

  // zip으로 한번에 묶어서 다운로드한다 (알림이 여러 번 뜨는 문제 방지, 모든 브라우저에서 동작)
  async function handleDownloadAll() {
    if (files.length === 0) return;
    setDownloadingAll(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      await Promise.all(
        files.map(async (f, i) => {
          const res = await fetch(f.file_url);
          const blob = await res.blob();
          zip.file(filenameFor(f, i), blob);
        })
      );
      const content = await zip.generateAsync({ type: 'blob' });
      const blobUrl = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${VEHICLE_FILE_LABEL[fileType]}_전체.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch {
      alert('전체 다운로드에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setDownloadingAll(false);
    }
  }

  return (
    <div className={fillHeight ? 'flex flex-col' : undefined}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-ink-700">{VEHICLE_FILE_LABEL[fileType]}</h3>
        <div className="flex items-center gap-1.5">
          {files.length > 1 && (
            <button
              type="button"
              onClick={handleDownloadAll}
              disabled={downloadingAll}
              className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50 disabled:opacity-60"
            >
              {downloadingAll ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {downloadingAll ? '다운로드 중...' : '전체 다운로드'}
            </button>
          )}
          {files.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={deletingAll}
              className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-50 disabled:opacity-60"
            >
              {deletingAll ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              전체 삭제
            </button>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50 disabled:opacity-60"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? '업로드 중...' : '업로드'}
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          onChange={handleFiles}
          className="hidden"
        />
      </div>

      {files.length === 0 ? (
        <p
          className={`rounded-xl border border-dashed border-ink-200 bg-white py-6 text-center text-xs text-ink-400 ${
            fillHeight ? 'flex flex-1 items-center justify-center py-0' : ''
          }`}
        >
          등록된 파일이 없습니다. (여러 장을 한번에 선택해서 올릴 수 있어요)
        </p>
      ) : gridPreview ? (
        <div
          className={
            fillHeight
              ? 'grid flex-1 auto-rows-fr grid-cols-2 gap-2'
              : 'grid grid-cols-4 gap-2 sm:grid-cols-5'
          }
        >
          {files.map((f) => {
            const broken = brokenIds.has(f.id) || !isImageUrl(f.file_url);
            return (
              <div
                key={f.id}
                className={`group relative cursor-pointer overflow-hidden rounded-lg border border-ink-200 bg-ink-50 ${
                  fillHeight ? 'min-h-[110px]' : 'aspect-square'
                }`}
                onClick={() => handlePreview(f)}
              >
                {broken ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-ink-300">
                    <ImageOff size={20} />
                    <span className="text-[10px]">확인 필요</span>
                  </div>
                ) : (
                  <img
                    src={f.file_url}
                    alt="차량 사진"
                    className={`h-full w-full ${fillHeight ? 'object-contain bg-white' : 'object-cover'}`}
                    loading="lazy"
                    onError={() =>
                      setBrokenIds((prev) => {
                        const next = new Set(prev);
                        next.add(f.id);
                        return next;
                      })
                    }
                  />
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    forceDownload(f.file_url, filenameFor(f));
                  }}
                  className="absolute bottom-1 left-1 rounded-full bg-black/60 p-1 text-white"
                >
                  <Download size={12} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(f.id);
                  }}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {files.map((f) => (
            <li
              key={f.id}
              onClick={() => handlePreview(f)}
              className="flex cursor-pointer items-center justify-between rounded-lg border border-ink-200 bg-white px-3 py-2 hover:bg-ink-50/60"
            >
              <span className="flex items-center gap-2 text-sm text-ink-700">
                <FileText size={14} className="text-ink-400" />
                {new Date(f.created_at).toLocaleDateString('ko-KR')} 업로드 (클릭해서 확인)
              </span>
              <span className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    forceDownload(f.file_url, filenameFor(f));
                  }}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                >
                  <Download size={13} />
                  다운로드
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(f.id);
                  }}
                  className="rounded-lg p-1 text-ink-300 hover:bg-rose-50 hover:text-rose-500"
                >
                  <Trash2 size={14} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {previewSrc && <PreviewModal src={previewSrc} onClose={() => setPreviewSrc(null)} />}
    </div>
  );
}
