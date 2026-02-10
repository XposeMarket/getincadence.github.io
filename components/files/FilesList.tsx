'use client'

import { useState, useEffect } from 'react'
import {
  FileText, Image, File, Download, Eye, Edit2, Trash2,
  MoreHorizontal, ChevronDown, ChevronUp, Upload, Clock,
  FileSpreadsheet, Receipt, FileCheck, Loader2, X, Check
} from 'lucide-react'

export interface FileRecord {
  id: string
  title: string
  original_filename: string
  doc_type: string
  mime_type: string
  size_bytes: number
  version_number: number
  parent_file_id: string | null
  uploaded_by_user_id: string
  created_at: string
  updated_at: string
  uploaded_by: {
    id: string
    full_name: string
  }
  versions?: {
    id: string
    version_number: number
    created_at: string
    title: string
    size_bytes: number
  }[]
  linked_to?: {
    entity_type: string
    entity_id: string
    entity_name?: string
  }[]
}

interface FilesListProps {
  files: FileRecord[]
  loading: boolean
  entityType: 'deal' | 'company' | 'contact'
  entityId: string
  onRefresh: () => void
  /** If true, show upload button (primary entity like deal) */
  canUpload?: boolean
  onUploadClick?: () => void
  /** If true, show where file is linked from (for related views) */
  showSource?: boolean
}

const DOC_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  contract: { label: 'Contract', color: 'text-blue-700', bg: 'bg-blue-50' },
  receipt: { label: 'Receipt', color: 'text-green-700', bg: 'bg-green-50' },
  proposal: { label: 'Proposal', color: 'text-purple-700', bg: 'bg-purple-50' },
  invoice: { label: 'Invoice', color: 'text-orange-700', bg: 'bg-orange-50' },
  other: { label: 'Other', color: 'text-gray-700', bg: 'bg-gray-100' },
}

const DOC_TYPES = [
  { value: 'contract', label: 'Contract' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'other', label: 'Other' },
]

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image size={18} className="text-pink-500" />
  if (mimeType === 'application/pdf') return <FileText size={18} className="text-red-500" />
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv'))
    return <FileSpreadsheet size={18} className="text-green-600" />
  return <File size={18} className="text-gray-500" />
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function FilesList({
  files,
  loading,
  entityType,
  entityId,
  onRefresh,
  canUpload = false,
  onUploadClick,
  showSource = false,
}: FilesListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <FileText size={20} className="text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 mb-3">No files yet</p>
        {canUpload && onUploadClick && (
          <button onClick={onUploadClick} className="btn btn-primary text-sm">
            <Upload size={16} className="mr-2" />
            Upload File
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {files.map(file => (
        <FileRow
          key={file.id}
          file={file}
          entityType={entityType}
          entityId={entityId}
          onRefresh={onRefresh}
          showSource={showSource}
        />
      ))}
    </div>
  )
}

function FileRow({
  file,
  entityType,
  entityId,
  onRefresh,
  showSource,
}: {
  file: FileRecord
  entityType: string
  entityId: string
  onRefresh: () => void
  showSource: boolean
}) {
  const [showActions, setShowActions] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(file.title)
  const [editDocType, setEditDocType] = useState(file.doc_type)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const docConfig = DOC_TYPE_CONFIG[file.doc_type] || DOC_TYPE_CONFIG.other
  const hasVersions = file.versions && file.versions.length > 1

  const handleView = async (fileId?: string) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/files/${fileId || file.id}/view-url`)
      if (res.ok) {
        const data = await res.json()
        window.open(data.view_url, '_blank')
      }
    } catch (err) {
      console.error('Failed to get view URL:', err)
    }
    setActionLoading(false)
    setShowActions(false)
  }

  const handleDownload = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/files/${file.id}/view-url`)
      if (res.ok) {
        const data = await res.json()
        const link = document.createElement('a')
        link.href = data.view_url
        link.download = file.original_filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (err) {
      console.error('Failed to download:', err)
    }
    setActionLoading(false)
    setShowActions(false)
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/files/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, doc_type: editDocType }),
      })
      if (res.ok) {
        setEditing(false)
        onRefresh()
      }
    } catch (err) {
      console.error('Failed to update file:', err)
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/files/${file.id}`, { method: 'DELETE' })
      if (res.ok) {
        onRefresh()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete')
      }
    } catch (err) {
      console.error('Failed to delete file:', err)
    }
    setDeleting(false)
    setShowDeleteConfirm(false)
    setShowActions(false)
  }

  if (editing) {
    return (
      <div className="p-3 sm:p-4 bg-gray-50">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="input text-sm"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select value={editDocType} onChange={(e) => setEditDocType(e.target.value)} className="input text-sm">
              {DOC_TYPES.map(dt => (
                <option key={dt.value} value={dt.value}>{dt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(false)} className="btn btn-secondary text-sm py-1.5 px-3">Cancel</button>
            <button onClick={handleSaveEdit} disabled={saving} className="btn btn-primary text-sm py-1.5 px-3">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} className="mr-1" />}
              Save
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-3 sm:p-4 hover:bg-gray-50 transition-colors group">
        <div className="flex items-start gap-3">
          {/* File icon */}
          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
            {getFileIcon(file.mime_type)}
          </div>

          {/* File info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">{file.title}</p>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${docConfig.color} ${docConfig.bg}`}>
                {docConfig.label}
              </span>
              {hasVersions && (
                <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                  v{file.version_number}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
              <span className="text-xs text-gray-500">{formatFileSize(file.size_bytes)}</span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-500">{file.uploaded_by.full_name}</span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-400">{formatDate(file.created_at)}</span>
            </div>
            {/* Source info for related views */}
            {showSource && file.linked_to && file.linked_to.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {file.linked_to.map((link, idx) => (
                  <span key={idx} className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    {link.entity_type === 'deal' ? `Deal: ${link.entity_name || link.entity_id}` :
                     link.entity_type === 'company' ? 'Direct' :
                     'Contact'}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Version toggle */}
            {hasVersions && (
              <button
                onClick={() => setShowVersions(!showVersions)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                title="View versions"
              >
                {showVersions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
            {/* Quick view */}
            <button
              onClick={() => handleView()}
              disabled={actionLoading}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="View file"
            >
              <Eye size={16} />
            </button>
            {/* More actions */}
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <MoreHorizontal size={16} />
              </button>
              {showActions && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                  <div className="absolute right-0 bottom-full mb-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                    <button onClick={() => handleView()} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <Eye size={14} /> View
                    </button>
                    <button onClick={handleDownload} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <Download size={14} /> Download
                    </button>
                    <button onClick={() => { setEditing(true); setShowActions(false) }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <Edit2 size={14} /> Edit
                    </button>
                    <hr className="my-1 border-gray-100" />
                    <button onClick={() => { setShowDeleteConfirm(true); setShowActions(false) }} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Version chain */}
      {showVersions && file.versions && (
        <div className="bg-gray-50 border-t border-gray-100 px-4 py-2">
          <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
            <Clock size={12} /> Version History
          </p>
          <div className="space-y-1.5">
            {file.versions.map((v) => (
              <div
                key={v.id}
                className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                  v.id === file.id ? 'bg-primary-50 border border-primary-200' : 'bg-white border border-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${v.id === file.id ? 'text-primary-700' : 'text-gray-600'}`}>
                    v{v.version_number}
                  </span>
                  <span className="text-gray-500">{formatDate(v.created_at)}</span>
                  <span className="text-gray-400">{formatFileSize(v.size_bytes)}</span>
                </div>
                {v.id !== file.id && (
                  <button
                    onClick={() => handleView(v.id)}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    View
                  </button>
                )}
                {v.id === file.id && (
                  <span className="text-primary-600 font-medium">Current</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm animate-slide-up">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Delete File</h3>
              <button onClick={() => setShowDeleteConfirm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete <strong>{file.title}</strong>? This file will be removed from all linked entities.
              </p>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-secondary text-sm" disabled={deleting}>
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={deleting} className="btn bg-red-600 text-white hover:bg-red-700 text-sm">
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
