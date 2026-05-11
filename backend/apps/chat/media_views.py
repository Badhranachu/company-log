import mimetypes
import os
from django.conf import settings
from django.http import FileResponse, HttpResponse, Http404


CHUNK_SIZE = 1024 * 1024  # 1 MB


def serve_media_range(request, path):
    """Serve media files with HTTP Range support (enables video seek/streaming)."""
    # Resolve both paths to their real absolute forms to prevent path traversal
    media_root = os.path.realpath(settings.MEDIA_ROOT)
    full_path = os.path.realpath(os.path.join(media_root, path))
    # Reject anything that escapes MEDIA_ROOT
    if not full_path.startswith(media_root + os.sep):
        raise Http404
    if not os.path.exists(full_path) or not os.path.isfile(full_path):
        raise Http404

    content_type, _ = mimetypes.guess_type(full_path)
    content_type = content_type or 'application/octet-stream'
    file_size = os.path.getsize(full_path)

    range_header = request.META.get('HTTP_RANGE')
    if not range_header:
        response = FileResponse(open(full_path, 'rb'), content_type=content_type)
        response['Content-Length'] = file_size
        response['Accept-Ranges'] = 'bytes'
        response['Access-Control-Allow-Origin'] = '*'
        return response

    # Parse "bytes=start-end"
    try:
        range_spec = range_header.replace('bytes=', '')
        start_str, end_str = range_spec.split('-')
        start = int(start_str) if start_str else 0
        end = int(end_str) if end_str else file_size - 1
    except (ValueError, AttributeError):
        return HttpResponse(status=416)

    if start >= file_size or end >= file_size:
        response = HttpResponse(status=416)
        response['Content-Range'] = f'bytes */{file_size}'
        return response

    end = min(end, start + CHUNK_SIZE - 1, file_size - 1)
    length = end - start + 1

    with open(full_path, 'rb') as f:
        f.seek(start)
        data = f.read(length)

    response = HttpResponse(data, status=206, content_type=content_type)
    response['Content-Range'] = f'bytes {start}-{end}/{file_size}'
    response['Content-Length'] = length
    response['Accept-Ranges'] = 'bytes'
    response['Access-Control-Allow-Origin'] = '*'
    return response
