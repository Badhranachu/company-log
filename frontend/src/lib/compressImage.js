export function compressImage(file, { maxWidth = 1920, maxHeight = 1920, quality = 0.82 } = {}) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      const sourceIsGif = file.type === 'image/gif'
      const sourceIsPng = file.type === 'image/png'
      // Prefer WEBP for smaller uploads, keep PNG only when input is PNG.
      const mimeType = sourceIsGif ? file.type : (sourceIsPng ? 'image/png' : 'image/webp')
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file)
          const ext = mimeType === 'image/webp' ? 'webp' : mimeType === 'image/png' ? 'png' : 'jpg'
          const baseName = (file.name || 'upload').replace(/\.[^.]+$/, '')
          resolve(new File([blob], `${baseName}.${ext}`, { type: mimeType }))
        },
        mimeType,
        mimeType === 'image/png' ? undefined : quality
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}
