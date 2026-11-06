#!/system/bin/sh
APP="$1"
FILTER="$2"

if [ "$APP" = "minutedrama" ]; then
  if [ -n "$FILTER" ]; then
    FILES=$(ls -1tr /data/data/com.minute.minishort.drama/cache/dm_video_cache/tp_dp_file/*/${FILTER}*.mp4 2>/dev/null)
  else
    FILES=$(ls -1tr /data/data/com.minute.minishort.drama/cache/dm_video_cache/tp_dp_file/*/*.mp4 2>/dev/null)
  fi
  for f in $FILES; do
    if [ -f "$f" ]; then
      SZ=$(stat -c %s "$f" 2>/dev/null || echo 0)
      if [ -f "$f.cfg" ]; then
        B64=$(base64 "$f.cfg" 2>/dev/null | tr -d '\r\n')
        echo "$f|$SZ|$B64"
      else
        echo "$f|$SZ|COMPLETE"
      fi
    fi
  done
else
  if [ -n "$FILTER" ]; then
    FILES=$(ls -1tr /data/data/com.sodareels.drama.short/cache/pssdk/pssdk_video_cache/${FILTER}*.mdl 2>/dev/null)
  else
    FILES=$(ls -1tr /data/data/com.sodareels.drama.short/cache/pssdk/pssdk_video_cache/*.mdl 2>/dev/null)
  fi
  for f in $FILES; do
    if [ -f "$f" ]; then
      SZ=$(stat -c %s "$f" 2>/dev/null || echo 0)
      CONF="${f%.mdl}.mdlnodeconf"
      if [ -f "$CONF" ]; then
        B64=$(base64 "$CONF" 2>/dev/null | tr -d '\r\n')
        echo "$f|$SZ|$B64"
      else
        echo "$f|$SZ|NOCONF"
      fi
    fi
  done
fi
