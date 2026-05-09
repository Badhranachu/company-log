import { useState } from 'react'
import { FiDownload, FiX } from 'react-icons/fi'

function ImageLightbox({ src, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white p-2 rounded-full bg-black/40 hover:bg-black/60" onClick={onClose}>
        <FiX size={22} />
      </button>
      <img src={src} alt="full" className="max-w-[92vw] max-h-[88vh] rounded-xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
    </div>
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
            alt="image"
            className="w-full object-cover rounded-xl"
            style={{ maxHeight: 260 }}
          />
        </div>
        {lightbox && <ImageLightbox src={msg.attachment_url} onClose={() => setLightbox(false)} />}
      </>
    )
  }

  if (msg.attachment_type === 'video') {
    return (
      <video controls className="rounded-xl mt-2 max-w-[260px] w-full" style={{ maxHeight: 200 }}>
        <source src={msg.attachment_url} />
      </video>
    )
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
