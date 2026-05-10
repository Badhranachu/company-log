import { useState } from 'react'
import { FiDownload, FiX, FiPlay } from 'react-icons/fi'

function ImageLightbox({ src, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white p-2 rounded-full bg-black/40 hover:bg-black/60" onClick={onClose}>
        <FiX size={22} />
      </button>
      <img
        src={src}
        alt="full"
        className="max-w-[92vw] max-h-[88vh] rounded-xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

function VideoPlayer({ src }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <>
      <div
        className="mt-2 rounded-xl overflow-hidden bg-black max-w-[260px] cursor-pointer relative group"
        style={{ maxHeight: 180 }}
        onClick={() => setExpanded(true)}
      >
        <video
          className="w-full h-full object-cover rounded-xl"
          style={{ maxHeight: 180 }}
          preload="metadata"
        >
          <source src={src} />
        </video>
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition">
          <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow">
            <FiPlay size={18} className="text-slate-800 ml-0.5" />
          </div>
        </div>
      </div>
      {expanded && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setExpanded(false)}>
          <button className="absolute top-4 right-4 text-white p-2 rounded-full bg-black/40 hover:bg-black/60" onClick={() => setExpanded(false)}>
            <FiX size={22} />
          </button>
          <video
            controls
            autoPlay
            className="max-w-[92vw] max-h-[88vh] rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <source src={src} />
          </video>
        </div>
      )}
    </>
  )
}

export default function AttachmentPreview({ msg }) {
  const [lightbox, setLightbox] = useState(false)
  if (!msg.attachment_url) return null

  if (msg.attachment_type === 'image') {
    return (
      <>
        <div className="mt-2 rounded-xl overflow-hidden cursor-zoom-in max-w-[260px]" onClick={() => setLightbox(true)}>
          <img
            src={msg.attachment_url}
            alt=""
            className="w-full object-cover rounded-xl"
            style={{ maxHeight: 260 }}
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        </div>
        {lightbox && <ImageLightbox src={msg.attachment_url} onClose={() => setLightbox(false)} />}
      </>
    )
  }

  if (msg.attachment_type === 'video') {
    return <VideoPlayer src={msg.attachment_url} />
  }

  return (
    <a
      href={msg.attachment_url}
      target="_blank"
      rel="noreferrer"
      className="mt-2 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 max-w-[260px]"
    >
      <FiDownload className="shrink-0" />
      <span className="truncate">{msg.attachment_type?.toUpperCase() || 'FILE'}</span>
    </a>
  )
}
