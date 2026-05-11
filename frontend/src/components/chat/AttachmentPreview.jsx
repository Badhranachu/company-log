import { useState, useRef, useEffect } from 'react'
import { FiDownload, FiX, FiPlay, FiPause } from 'react-icons/fi'

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
        className="mt-2 rounded-xl overflow-hidden bg-black w-full max-w-[240px] cursor-pointer relative group"
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

const BARS = [2,3,5,8,6,10,5,12,7,9,4,11,6,8,3,10,7,4,9,5,8,3,7,10,4,8,6,11,5,9,3,7]

function AudioPlayer({ src, mine }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onLoaded = () => setDuration(audio.duration || 0)
    const onTime = () => {
      setCurrent(audio.currentTime)
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0)
    }
    const onEnded = () => { setPlaying(false); setProgress(0); setCurrent(0) }
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play(); setPlaying(true) }
  }

  const seek = (e) => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    audio.currentTime = pct * audio.duration
  }

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00'
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  const filledBars = Math.round((progress / 100) * BARS.length)
  const filled = mine ? 'bg-emerald-700 dark:bg-emerald-300' : 'bg-emerald-500 dark:bg-emerald-400'
  const empty = mine ? 'bg-emerald-600/40 dark:bg-emerald-700/50' : 'bg-slate-300 dark:bg-slate-600'

  return (
    <div className="mt-1 flex items-center gap-2 w-full max-w-[220px] min-w-0">
      <audio ref={audioRef} src={src} preload="metadata" />
      {/* Play / Pause button */}
      <button
        onClick={toggle}
        className="shrink-0 w-10 h-10 rounded-full bg-white/30 dark:bg-white/10 flex items-center justify-center shadow-sm active:scale-95 transition-transform"
      >
        {playing
          ? <FiPause size={18} className="text-slate-700 dark:text-white" />
          : <FiPlay size={18} className="text-slate-700 dark:text-white ml-0.5" />}
      </button>

      {/* Waveform + time */}
      <div className="flex-1 min-w-0">
        {/* Waveform bars — tappable to seek */}
        <div
          className="flex items-center gap-[2px] h-8 cursor-pointer select-none"
          onClick={seek}
          onTouchStart={seek}
        >
          {BARS.map((h, i) => (
            <div
              key={i}
              className={`rounded-full flex-1 transition-colors ${i < filledBars ? filled : empty}`}
              style={{ height: `${Math.max(3, h * 2)}px` }}
            />
          ))}
        </div>
        {/* Duration */}
        <p className="text-[10px] opacity-70 tabular-nums -mt-0.5">
          {playing ? fmt(current) : fmt(duration)}
        </p>
      </div>
    </div>
  )
}

export default function AttachmentPreview({ msg, mine }) {
  const [lightbox, setLightbox] = useState(false)
  if (!msg.attachment_url) return null

  if (msg.attachment_type === 'audio') {
    return <AudioPlayer src={msg.attachment_url} mine={mine} />
  }

  if (msg.attachment_type === 'image') {
    return (
      <>
        <div className="mt-2 rounded-xl overflow-hidden cursor-zoom-in w-full max-w-[240px]" onClick={() => setLightbox(true)}>
          <img
            src={msg.attachment_url}
            alt=""
            className="w-full object-cover rounded-xl"
            style={{ maxHeight: 240 }}
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
      className="mt-2 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 w-full max-w-[240px]"
    >
      <FiDownload className="shrink-0" />
      <span className="truncate">{msg.attachment_type?.toUpperCase() || 'FILE'}</span>
    </a>
  )
}
