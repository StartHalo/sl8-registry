# Getting the source onto the machine

Used by step 6 of SKILL.md. Every later step needs a local copy under `work/<p>/`.

## Contents
- Public links
- Platform links
- Probe and size

## Public links
Probe with a one-byte ranged GET, not HEAD (a presigned S3 or GCS link is signed for GET, so HEAD
returns 403 on a working link) and follow redirects:
`curl -s -o /dev/null -r 0-0 -L -D - "<url>" | head -20`. Read the final status, `Content-Type` and the
total after `Content-Range: bytes 0-0/`.
- 200 or 206 with `video/*` or `audio/*`: download with `curl -fL -o work/<p>/source.mp4 "<url>"`.
- `text/html` is a page: ask for the direct file.
- 401 or 403 on the ranged GET, or a redirect that ends at a login page: ask for a public link or the
  file; never get round a login.
- 404: ask to re-share.
- `application/octet-stream`: usually works; note the risk.
- Size 0 or no `Content-Range`: try the download anyway and check the size.
- Google Drive, Loom, Notion and Slack links do not work; Dropbox `?dl=0` becomes `?dl=1`.
- A presigned link must stay valid until the download ends.

## Platform links
YouTube or Vimeo: `yt-dlp -o 'work/<p>/source.%(ext)s' "<url>"`. The consent gate still applies to
whoever appears in it.

## Probe and size
`ffprobe -v error -show_entries stream=codec_type,width,height,bit_rate:format=duration,bit_rate -of json work/<p>/source.mp4 > work/<p>/source.probe.json`
(a video and an audio stream). If a call later fails with exit 2 (payload too large), re-encode the
video: `ffmpeg -i work/<p>/source.mp4 -c:v libx264 -crf 28 -preset medium -c:a aac -b:a 128k -movflags +faststart work/<p>/source_small.mp4`;
an audio file too large is re-encoded at a lower bitrate the same way (`-b:a 64k`) or cut. The
gateway upload limit is unread (learnings VID-L481).
