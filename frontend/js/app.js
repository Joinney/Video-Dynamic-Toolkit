    let remoteCache = [];
    let detectedDrama = '';
    let currentPosterUrl = '';
    let dramaMap = {};
    let lastDetectedDramaId = null;
    let isPinnedOldDrama = false;
    let latestCurrentDrama = null;
    let latestLocalDramas = [];
    let currentAppMode = 'auto';
    let currentActiveApp = 'sodareels';

    async function switchApp(appKey) {
      currentAppMode = appKey;
      updateAppTabsUI();
      try {
        await fetch('/api/set-app', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ app: appKey })
        });
      } catch (e) {}
      lastDetectedDramaId = null; // Reset so new drama is picked up
      loadStatus(true);
    }

    function updateAppTabsUI() {
      ['auto', 'sodareels', 'minutedrama'].forEach(id => {
        const el = document.getElementById('tab-' + id);
        if (el) {
          el.className = (id === currentAppMode) ? 'app-tab active' : 'app-tab';
        }
      });
    }

    function updateTopPoster(imageUrl, desc, title) {
      const imgEl = document.getElementById('top-poster-img');
      const placeholder = document.getElementById('top-poster-placeholder');
      const descEl = document.getElementById('top-drama-desc');
      const dlBtn = document.getElementById('btn-download-top-poster');

      currentPosterUrl = imageUrl || '';

      if (imageUrl) {
        const proxySrc = imageUrl.startsWith('/') ? imageUrl : '/api/proxy-img?url=' + encodeURIComponent(imageUrl);
        imgEl.src = proxySrc;
        imgEl.style.display = 'block';
        placeholder.style.display = 'none';
        dlBtn.href = proxySrc;
        dlBtn.style.opacity = '1';
        dlBtn.style.pointerEvents = 'auto';
      } else {
        const localSrc = '/poster/' + encodeURIComponent(title || 'current');
        imgEl.src = localSrc;
        imgEl.onload = () => {
          imgEl.style.display = 'block';
          placeholder.style.display = 'none';
          dlBtn.href = localSrc;
          dlBtn.style.opacity = '1';
          dlBtn.style.pointerEvents = 'auto';
        };
        imgEl.onerror = () => {
          imgEl.style.display = 'none';
          placeholder.style.display = 'flex';
          dlBtn.style.opacity = '0.5';
          dlBtn.style.pointerEvents = 'none';
        };
      }

      if (descEl) {
        descEl.innerText = desc || 'Chưa có mô tả chi tiết cho bộ phim này.';
      }
    }

    async function loadStatus(forceSync = false) {
      try {
        const curTitle = document.getElementById('drama-title-input')?.value.trim() || '';
        const res = await fetch('/api/status?app=' + encodeURIComponent(currentAppMode) + '&drama=' + encodeURIComponent(curTitle));
        const data = await res.json();

        currentActiveApp = data.activeApp || 'sodareels';
        currentAppMode = data.currentAppMode || currentAppMode;
        updateAppTabsUI();

        // Update active app indicator
        const appIcon = document.getElementById('active-app-icon');
        const appName = document.getElementById('active-app-name');
        if (data.supportedApps && data.supportedApps[currentActiveApp]) {
          const info = data.supportedApps[currentActiveApp];
          appIcon.innerText = info.icon;
          appName.innerText = info.name + (currentAppMode === 'auto' ? ' (Tự Động)' : ' (Cố Định)');
        }

        // ADB Badge
        const dot = document.getElementById('adb-dot');
        const text = document.getElementById('adb-text');
        if (data.connected) {
          dot.className = 'dot online';
          text.innerText = 'LDPlayer: ' + data.deviceName;
        } else {
          dot.className = 'dot';
          text.innerText = 'Chưa kết nối LDPlayer';
        }

        // Drama detection
        const titleInput = document.getElementById('drama-title-input');
        if (data.allDramas) {
          data.allDramas.forEach(d => { dramaMap[d.title] = d; });
        }
        latestCurrentDrama = data.currentDrama;

        if (data.currentDrama) {
          const newDramaId = data.currentDrama.id;
          const isNewDramaFromApp = (lastDetectedDramaId !== null && String(lastDetectedDramaId) !== String(newDramaId));

          if (!isPinnedOldDrama || forceSync) {
            if (isNewDramaFromApp || !titleInput.value || forceSync) {
              titleInput.value = data.currentDrama.title;
              detectedDrama = data.currentDrama.title;
              delete document.getElementById('start-ep-input').dataset.manualEdited;
              updateTopPoster(data.currentDrama.image, data.currentDrama.desc, data.currentDrama.title);

              if (isNewDramaFromApp) {
                showToast('🎬 Phát hiện phim mới: "' + data.currentDrama.title + '"! Đã tự động tạo cấu hình.', 'success');
              }
            }
          }
          lastDetectedDramaId = newDramaId;
        } else if (titleInput.value && !currentPosterUrl && dramaMap[titleInput.value]) {
          const d = dramaMap[titleInput.value];
          updateTopPoster(d.image, d.desc, d.title);
        }

        // Drama tags
        const tagsContainer = document.getElementById('drama-tags-container');
        if (data.allDramas && data.allDramas.length > 0) {
          tagsContainer.innerHTML = '<span style="font-size: 11px; color: #64748b; width: 100%;">Phim gần đây trong app:</span>' + 
            data.allDramas.map(d => `
              <span class="drama-tag" onclick="selectDramaTag('${d.title.replace(/'/g, "\\\'")}')">
                ${d.title}
              </span>
            `).join('');
        } else {
          tagsContainer.innerHTML = '';
        }

        // Local dramas
        latestLocalDramas = data.localDramas || [];
        updateEpisodeNumberHint();
        renderLocalDramas(latestLocalDramas);

        // Remote queue
        remoteCache = data.remoteList || [];
        renderQueue(remoteCache);

        checkSwipeStatus();

      } catch (err) {
        console.error(err);
      }
    }

    function getSelectedLocalDrama() {
      const title = document.getElementById('drama-title-input').value.trim();
      if (!title) return null;
      const safeName = title.replace(/[<>:"/\\|?*]/g, ' - ').replace(/\s+/g, ' ').trim().toLowerCase();
      return latestLocalDramas.find(d => 
        d.name.toLowerCase() === safeName ||
        d.name.toLowerCase().includes(safeName) ||
        safeName.includes(d.name.toLowerCase())
      ) || null;
    }

    function updateEpisodeNumberHint() {
      const matched = getSelectedLocalDrama();
      const startInput = document.getElementById('start-ep-input');
      const epHint = document.getElementById('ep-hint');
      const modeBadge = document.getElementById('drama-mode-badge');
      if (!epHint) return;

      if (matched && matched.count > 0) {
        if (!startInput.dataset.manualEdited) {
          startInput.value = matched.nextEpisode;
        }
        epHint.innerHTML = '📁 Thư mục đã có <b>' + matched.count + ' tập</b> (Tập 1 -> ' + matched.maxEpisode + '). <b>Tự đặt tập kế tiếp: ' + matched.nextEpisode + '</b>';
        epHint.style.color = '#38bdf8';
        if (modeBadge) {
          if (isPinnedOldDrama) {
            modeBadge.className = 'drama-mode-badge mode-pinned';
            modeBadge.innerHTML = '📌 Đang Chọn Cập Nhật Phim Cũ (Tiếp tục Tập ' + matched.nextEpisode + ') <button type="button" class="btn-badge-action" onclick="syncWithAppDrama(true)">⚡ Đồng bộ phim app</button>';
          } else {
            modeBadge.className = 'drama-mode-badge mode-existing';
            modeBadge.innerHTML = '📁 Đã có sẵn trên máy (Tự đặt tiếp Tập ' + matched.nextEpisode + ')';
          }
          modeBadge.style.display = 'inline-flex';
        }
      } else {
        if (!startInput.dataset.manualEdited) {
          startInput.value = 1;
        }
        epHint.innerHTML = '✨ Bộ phim mới, sẽ tự tạo thư mục riêng & bắt đầu lưu từ <b>Tập 01</b>';
        epHint.style.color = '#34d399';
        if (modeBadge) {
          modeBadge.className = 'drama-mode-badge mode-new';
          modeBadge.innerHTML = '✨ BỘ PHIM MỚI TOANH (Tự tạo thư mục mới & tải poster khi xuất)';
          modeBadge.style.display = 'inline-flex';
        }
      }
    }

    function selectDramaForUpdate(name) {
      isPinnedOldDrama = true;
      const input = document.getElementById('drama-title-input');
      input.value = name;
      delete document.getElementById('start-ep-input').dataset.manualEdited;

      const matched = latestLocalDramas.find(d => d.name.toLowerCase() === name.toLowerCase());
      const startInput = document.getElementById('start-ep-input');
      if (matched && matched.nextEpisode) {
        startInput.value = matched.nextEpisode;
      }

      if (dramaMap[name]) {
        updateTopPoster(dramaMap[name].image, dramaMap[name].desc, name);
      } else {
        updateTopPoster('', '', name);
      }

      updateEpisodeNumberHint();
      renderQueue(remoteCache);
      renderLocalDramas(latestLocalDramas);

      const configCard = document.getElementById('drama-config-card');
      if (configCard) {
        configCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        configCard.style.boxShadow = '0 0 24px rgba(56, 189, 248, 0.4)';
        setTimeout(() => { configCard.style.boxShadow = ''; }, 1500);
      }
      showToast('📁 Đã chọn bộ phim cũ: "' + name + '". Đang tiếp tục từ tập ' + startInput.value + '!', 'success');
    }

    async function clearDramaConfig() {
      const input = document.getElementById('drama-title-input');
      if (input) input.value = '';
      const startInput = document.getElementById('start-ep-input');
      if (startInput) {
        startInput.value = '1';
        delete startInput.dataset.manualEdited;
      }
      isPinnedOldDrama = false;
      lastDetectedDramaId = null;
      latestCurrentDrama = null;
      detectedDrama = '';
      updateTopPoster('', '', '');
      updateEpisodeNumberHint();
      lastRenderedSignature = '';
      renderQueue(remoteCache);
      renderLocalDramas(latestLocalDramas);
      showToast('🧹 Đang làm sạch và nhận diện lại từ app...', 'info');
      await loadStatus(true);
    }

    async function syncWithAppDrama(manual = false) {
      isPinnedOldDrama = false;
      if (manual) showToast('🔄 Đang kiểm tra app trên giả lập...', 'info');
      await loadStatus(true);
      if (!latestCurrentDrama || !latestCurrentDrama.title) {
        if (manual) showToast('⚠️ Chưa phát hiện phim đang mở trên app! Hãy mở 1 tập phim trên giả lập rồi bấm lại.', 'error');
        return;
      }
      const input = document.getElementById('drama-title-input');
      input.value = latestCurrentDrama.title;
      delete document.getElementById('start-ep-input').dataset.manualEdited;
      updateTopPoster(latestCurrentDrama.image, latestCurrentDrama.desc, latestCurrentDrama.title);
      updateEpisodeNumberHint();
      lastRenderedSignature = '';
      renderQueue(remoteCache);
      renderLocalDramas(latestLocalDramas);
      if (manual) {
        showToast('⚡ Đã đồng bộ sang phim đang mở: "' + latestCurrentDrama.title + '"!', 'success');
      }
    }

    function selectDramaTag(name) {
      const matchedLocal = latestLocalDramas.find(d => d.name.toLowerCase() === name.toLowerCase());
      if (matchedLocal) {
        selectDramaForUpdate(name);
        return;
      }

      isPinnedOldDrama = false;
      const input = document.getElementById('drama-title-input');
      input.value = name;
      delete document.getElementById('start-ep-input').dataset.manualEdited;
      updateEpisodeNumberHint();
      if (dramaMap[name]) {
        updateTopPoster(dramaMap[name].image, dramaMap[name].desc, name);
      } else {
        updateTopPoster('', '', name);
      }
      lastRenderedSignature = '';
      renderQueue(remoteCache);
      renderLocalDramas(latestLocalDramas);
      showToast('✨ Đã chọn cấu hình phim: "' + name + '"!', 'success');
    }

    const selectedCachePaths = new Set();
    const initializedPathSet = new Set();
    let lastRenderedSignature = '';

    function handleCheckboxChange(cb, ev) {
      if (ev) ev.stopPropagation();
      if (cb.checked) {
        selectedCachePaths.add(cb.value);
      } else {
        selectedCachePaths.delete(cb.value);
      }
      updateSelectedExportBtn();
    }

    function handleQueueRowClick(event, rowEl) {
      // Bấm vào nút xem thử, nút xóa, hoặc trực tiếp vào input checkbox thì không toggle 2 lần
      if (event.target.closest('button') || event.target.closest('.queue-thumb-mini') || event.target.tagName === 'INPUT') {
        return;
      }
      const chk = rowEl.querySelector('.queue-checkbox');
      if (chk) {
        chk.checked = !chk.checked;
        handleCheckboxChange(chk);
      }
    }

    function selectOnlyNew() {
      selectedCachePaths.clear();
      const items = document.querySelectorAll('.queue-item');
      items.forEach(el => {
        const chk = el.querySelector('.queue-checkbox');
        const isDownloaded = el.getAttribute('data-downloaded') === 'true';
        const isComplete = el.getAttribute('data-complete') === 'true';
        if (chk) {
          const shouldCheck = (!isDownloaded && isComplete);
          chk.checked = shouldCheck;
          if (shouldCheck) selectedCachePaths.add(chk.value);
        }
      });
      updateSelectedExportBtn();
      showToast('⭐ Đã chọn các tập mới (đủ 100%)', 'success');
    }

    function toggleSelectAll(state) {
      const boxes = document.querySelectorAll('.queue-checkbox');
      boxes.forEach(b => {
        b.checked = state;
        if (state) {
          selectedCachePaths.add(b.value);
        } else {
          selectedCachePaths.delete(b.value);
        }
      });
      if (!state) selectedCachePaths.clear();
      updateSelectedExportBtn();
      showToast(state ? '✅ Đã chọn tất cả tập' : '⚪ Đã bỏ chọn tất cả', 'info');
    }

    function updateSelectedExportBtn() {
      const btn = document.getElementById('btn-export-selected');
      if (!btn) return;
      const count = selectedCachePaths.size;
      if (count > 0) {
        btn.innerHTML = `📥 XUẤT ${count} TẬP ĐÃ CHỌN VÀO BỘ NÀY`;
      } else {
        btn.innerHTML = `📥 XUẤT CÁC TẬP ĐÃ CHỌN VÀO BỘ NÀY`;
      }
    }

    let isQueueOrderReversed = false;

    function reverseQueueOrder() {
      isQueueOrderReversed = !isQueueOrderReversed;
      if (remoteCache && remoteCache.length > 0) {
        remoteCache.reverse();
        // Cập nhật lại số tập tuần tự sau khi đảo
        const matched = getSelectedLocalDrama();
        const baseEp = (matched && matched.maxEpisode > 0) ? (matched.maxEpisode + 1) : 1;
        let newCount = 0;
        remoteCache.forEach((item) => {
          if (!item.isDownloaded) {
            item.epNumber = baseEp + (newCount++);
            item.epLabel = `EP. ${item.epNumber}`;
          }
        });
        lastRenderedSignature = '';
        renderQueue(remoteCache);
        showToast('🔄 Đã đảo ngược chiều danh sách tập!', 'info');
      }
    }

    function handleEpNumChange(event, remotePath, val) {
      if (event) event.stopPropagation();
      const newEp = parseInt(val, 10);
      if (isNaN(newEp) || newEp < 1) return;
      const item = remoteCache.find(r => r.path === remotePath);
      if (item) {
        item.epNumber = newEp;
        item.epLabel = `EP. ${newEp}`;
        const chk = document.querySelector(`.queue-checkbox[value="${remotePath}"]`);
        if (chk) chk.setAttribute('data-ep', newEp);
        showToast(`✏️ Đã chỉnh thành Tập ${newEp}`, 'success');
      }
    }

    function renderQueue(list) {
      const c = document.getElementById('queue-list');
      if (list.length === 0) {
        selectedCachePaths.clear();
        initializedPathSet.clear();
        lastRenderedSignature = '';
        c.innerHTML = '<div style="color: #64748b; font-size: 13px; padding: 20px; text-align: center;">Chưa có video mới trong bộ nhớ cache. Hãy mở app và lướt tập phim, hoặc bấm "▶ Bắt Đầu Lướt" để tự động thu thập nhé!</div>';
        const countEl = document.getElementById('queue-count');
        if (countEl) countEl.innerText = '0';
        updateSelectedExportBtn();
        return;
      }

      const matchedDrama = getSelectedLocalDrama();
      let newCount = 0;
      let downloadedCount = 0;
      let incompleteCount = 0;

      list.forEach(item => {
        let matchedEp = null;
        if (matchedDrama && matchedDrama.videos) {
          matchedEp = matchedDrama.videos.find(v => {
            if (item.sizeBytes && v.sizeBytes && Math.abs(v.sizeBytes - item.sizeBytes) <= 32) {
              return true;
            }
            if (item.epNumber) {
              const m = v.name.match(/Tap_0*(\d+)/i);
              if (m && parseInt(m[1], 10) === item.epNumber) return true;
            }
            return false;
          });
        }

        const isDownloaded = !!matchedEp;
        item._isDownloaded = isDownloaded;
        item._matchedEp = matchedEp;

        if (isDownloaded) {
          downloadedCount++;
        } else {
          newCount++;
        }

        if (!item.isComplete) {
          incompleteCount++;
        }

        // Với các tập mới xuất hiện lần đầu trong phiên, tự động chọn nếu là tập mới + đủ 100%
        if (!initializedPathSet.has(item.path)) {
          initializedPathSet.add(item.path);
          if (!isDownloaded && item.isComplete) {
            selectedCachePaths.add(item.path);
          }
        }
      });

      // Tạo chuỗi signature để kiểm tra danh sách có thay đổi thực sự không
      const currentSignature = list.map(i => `${i.path}:${i.sizeBytes}:${i.isComplete}:${i._isDownloaded}`).join('|') + '|' + (matchedDrama ? matchedDrama.name : '');

      if (currentSignature !== lastRenderedSignature) {
        lastRenderedSignature = currentSignature;

        const itemsHtml = list.map(item => {
          const isDownloaded = item._isDownloaded;
          const matchedEp = item._matchedEp;
          const isChecked = selectedCachePaths.has(item.path) ? 'checked' : '';
          const opacityStyle = isDownloaded ? 'opacity: 0.65; background: rgba(15, 23, 42, 0.4);' : (!item.isComplete ? 'border: 1px dashed rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.03);' : '');

          let statusBadgeHtml = '';
          if (isDownloaded) {
            statusBadgeHtml = '<span class="badge-downloaded" title="Đã có trong thư mục máy tính">✅ Đã tải: ' + (matchedEp ? matchedEp.name : '') + '</span>';
          } else if (item.isComplete) {
            statusBadgeHtml = '<span style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">✅ Đủ 100% (' + item.sizeMb + ' MB)</span>';
          } else {
            statusBadgeHtml = '<span style="background: rgba(239, 68, 68, 0.18); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">⚠️ Chưa xong (' + item.pct + '% • ' + item.sizeMb + '/' + item.expectedMb + ' MB)</span>';
          }

          const needMoreHint = !item.isComplete ? ('<span style="color: #f87171; font-weight: 600;">(Cần đủ: ' + item.expectedMb + ' MB)</span>') : '';

          return `
          <div class="queue-item" data-path="${item.path.replace(/"/g, '&quot;')}" data-downloaded="${isDownloaded}" data-complete="${item.isComplete}" style="${opacityStyle}" onclick="handleQueueRowClick(event, this)">
            <input type="checkbox" class="queue-checkbox" id="chk_${item.index}" value="${item.path.replace(/"/g, '&quot;')}" data-ep="${item.epNumber || ''}" data-complete="${item.isComplete}" ${isChecked} onchange="handleCheckboxChange(this, event)">
            <div class="queue-thumb-mini" onclick="previewRemoteVideo('${item.path.replace(/'/g, "\\\'")}', 'Tập video ${item.epLabel || '#' + item.index}')" title="Bấm để xem thử video">
              <span style="font-size: 18px;">🎬</span>
              <div class="queue-thumb-overlay">▶</div>
            </div>
            <div class="queue-item-info" style="cursor: pointer;">
              <div class="queue-item-title" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span style="font-weight: 800; color: #38bdf8;">Tập</span>
                <input type="number" class="ep-num-input" value="${item.epNumber || item.index}" min="1" style="width: 52px; background: #0f172a; border: 1px solid #38bdf8; color: #38bdf8; font-weight: 800; border-radius: 6px; padding: 2px 4px; text-align: center; font-size: 13px;" onclick="event.stopPropagation()" onchange="handleEpNumChange(event, '${item.path.replace(/"/g, '&quot;')}', this.value)" title="Bấm vào để chỉnh lại số tập nếu muốn">
                <span style="color: #64748b; font-size: 11px;">(${item.epLabel || 'EP. ' + (item.epNumber || item.index)})</span>
                ${statusBadgeHtml}
              </div>
              <div class="queue-item-meta">
                Dung lượng: <b>${item.sizeMb} MB</b> ${needMoreHint} • Tải lúc: ${item.time}
              </div>
            </div>
            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
              ${item.directUrl ? `
                <a href="${item.directUrl}" target="_blank" class="btn btn-secondary" style="font-size: 11px; padding: 4px 8px; text-decoration: none; color: #38bdf8; border: 1px solid rgba(56,189,248,0.4);" onclick="event.stopPropagation()" title="Mở link video gốc trên tab mới để xem hoặc tải ngoài bằng IDM / Trình duyệt">
                  🔗 Link gốc
                </a>
                <button type="button" class="btn btn-primary" style="font-size: 11px; padding: 4px 8px; background: #10b981; border: none; font-weight: 700;" onclick="event.stopPropagation(); downloadSingleDirect('${item.directUrl.replace(/'/g, "\\\'")}', ${item.epNumber || item.index})" title="Tải siêu tốc trực tiếp từ CDN về máy tính trong 1-2 giây (không cần chờ giả lập nạp)">
                  ⚡ Tải 1s
                </button>
              ` : ''}
              <button type="button" class="btn-preview" onclick="previewRemoteVideo('${item.path.replace(/'/g, "\\\'")}', 'Tập video ${item.epLabel || '#' + item.index}', '${(item.directUrl || '').replace(/'/g, "\\\'")}')">
                ▶ Xem thử
              </button>
            </div>
          </div>
          `;
        }).join('');

        c.innerHTML = itemsHtml;
      } else {
        // Nếu danh sách không đổi, chỉ đồng bộ lại trạng thái checked của các ô input
        document.querySelectorAll('.queue-checkbox').forEach(cb => {
          cb.checked = selectedCachePaths.has(cb.value);
        });
      }

      const countEl = document.getElementById('queue-count');
      if (countEl) {
        let extraInfo = '';
        if (incompleteCount > 0) {
          extraInfo = ' • <span style="color: #f87171; font-weight: 700;">' + incompleteCount + ' tập chưa xong</span>';
        }
        countEl.innerHTML = list.length + ' (<span style="color: #38bdf8;">' + newCount + ' tập mới</span> • <span style="color: #10b981;">' + downloadedCount + ' đã tải</span>' + extraInfo + ')';
      }

      updateSelectedExportBtn();
    }

    async function startSwipe(explicitCount) {
      const countInput = document.getElementById('auto-swipe-count');
      const count = (explicitCount !== undefined) ? explicitCount : (countInput ? countInput.value : 1);
      const btnStart = document.getElementById('btn-start-swipe');
      const btnStartSingle = document.getElementById('btn-start-single');
      const btnStop = document.getElementById('btn-stop-swipe');
      const badge = document.getElementById('swipe-status-badge');

      if (btnStart) btnStart.style.display = 'none';
      if (btnStartSingle) btnStartSingle.style.display = 'none';
      if (btnStop) btnStop.style.display = 'inline-block';
      badge.style.background = '#0284c7';
      badge.style.color = '#fff';
      badge.innerText = (count === 1) ? 'Đang chuẩn bị lấy 1 tập...' : 'Đang chuẩn bị lướt ' + count + ' tập...';

      const dramaTitle = (document.getElementById('drama-title-input') ? document.getElementById('drama-title-input').value.trim() : '');
      const startEp = (document.getElementById('start-ep-input') ? parseInt(document.getElementById('start-ep-input').value, 10) : 1);
      const autoExportChk = document.getElementById('chk-auto-export');
      const autoExport = autoExportChk ? autoExportChk.checked : true;

      await fetch('/api/auto-swipe/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total: parseInt(count, 10) || 1,
          delay: 6,
          dramaTitle,
          startEpisode: startEp,
          autoExport
        })
      });
      checkSwipeStatus();
    }

    async function stopSwipe() {
      await fetch('/api/auto-swipe/stop', { method: 'POST' });
      const btnStart = document.getElementById('btn-start-swipe');
      const btnStartSingle = document.getElementById('btn-start-single');
      const btnStop = document.getElementById('btn-stop-swipe');
      if (btnStart) btnStart.style.display = 'inline-block';
      if (btnStartSingle) btnStartSingle.style.display = 'inline-block';
      if (btnStop) btnStop.style.display = 'none';
      const badge = document.getElementById('swipe-status-badge');
      badge.style.background = 'rgba(255,255,255,0.06)';
      badge.style.color = '#94a3b8';
      badge.innerText = 'Đã dừng';
    }

    async function checkSwipeStatus() {
      try {
        const res = await fetch('/api/auto-swipe/status');
        const data = await res.json();
        const badge = document.getElementById('swipe-status-badge');
        const btnStart = document.getElementById('btn-start-swipe');
        const btnStartSingle = document.getElementById('btn-start-single');
        const btnStop = document.getElementById('btn-stop-swipe');

        if (data.running) {
          if (btnStart) btnStart.style.display = 'none';
          if (btnStartSingle) btnStartSingle.style.display = 'none';
          if (btnStop) btnStop.style.display = 'inline-block';
          badge.style.background = '#0284c7';
          badge.style.color = '#fff';
          badge.innerText = data.status || ('Đang nạp: ' + data.current + '/' + data.total + ' tập...');
          setTimeout(checkSwipeStatus, 1000);
        } else {
          if (btnStart) btnStart.style.display = 'inline-block';
          if (btnStartSingle) btnStartSingle.style.display = 'inline-block';
          if (btnStop) btnStop.style.display = 'none';
          badge.style.background = 'rgba(255,255,255,0.06)';
          badge.style.color = '#94a3b8';
          if (data.status) {
            badge.innerText = data.status;
            if (data.status.startsWith('⚠️')) {
              badge.style.background = 'rgba(239, 68, 68, 0.2)';
              badge.style.color = '#f87171';
            } else if (data.status.startsWith('✅') || data.status.startsWith('Đã')) {
              badge.style.background = 'rgba(16, 185, 129, 0.2)';
              badge.style.color = '#34d399';
            }
          }
          loadStatus();
        }
      } catch (e) {}
    }

    async function restartApp() {
      if (confirm('Khởi động lại app sẽ giải phóng bộ nhớ RAM để bạn có thể xem lại và tải lại các tập đã xem trước đó. Tiếp tục?')) {
        showToast('⏳ Đang khởi động lại app trên giả lập...', 'info');
        const res = await fetch('/api/restart-app', { method: 'POST' });
        const d = await res.json();
        showToast('✅ Đã khởi động lại ' + (d.app || 'app') + '! Hãy mở tập cần tải.', 'success');
        setTimeout(loadStatus, 2000);
      }
    }

    let currentPreviewContext = null;

    function previewRemoteVideo(remotePath, label) {
      currentPreviewContext = { remotePath };
      document.getElementById('modal-title').innerText = label + ' (Xem trước từ giả lập)';
      const v = document.getElementById('player-video');
      const errBox = document.getElementById('player-error');
      if (errBox) errBox.style.display = 'none';

      v.onerror = () => {
        if (errBox) errBox.style.display = 'block';
      };

      v.src = '/api/preview-remote?path=' + encodeURIComponent(remotePath);
      document.getElementById('player-modal').style.display = 'flex';
      v.play().catch(() => {});
    }

    async function exportSelected() {
      const title = document.getElementById('drama-title-input').value.trim();
      if (!title) {
        alert('Vui lòng nhập hoặc chọn Tên Bộ Phim!');
        return;
      }

      const checkboxes = document.querySelectorAll('.queue-checkbox:checked');
      if (checkboxes.length === 0) {
        alert('Vui lòng tích chọn ít nhất 1 tập video để xuất!');
        return;
      }

      const incompleteBoxes = Array.from(checkboxes).filter(b => b.getAttribute('data-complete') === 'false');
      if (incompleteBoxes.length > 0) {
        const warnMsg = '⚠️ CẢNH BÁO THIẾU DỮ LIỆU:\n\nCó ' + incompleteBoxes.length + ' tập video bạn chọn CHƯA TẢI XONG 100% trong cache (mới tải dở dang).\n\nNếu xuất bây giờ, video sẽ bị dừng giữa chừng khi phát!\n\n👉 Bạn có chắc chắn muốn xuất luôn không?\n(Bấm CANCEL / HỦY để mở tập đó trên app cho tải đủ 100% rồi hãy xuất)';
        if (!confirm(warnMsg)) {
          return;
        }
      }

      const selectedPaths = Array.from(checkboxes).map(b => {
        const itemObj = remoteCache.find(r => r.path === b.value) || {};
        return {
          path: b.value,
          epNumber: parseInt(b.getAttribute('data-ep'), 10) || null,
          sizeBytes: itemObj.sizeBytes || 0
        };
      });
      const startEp = document.getElementById('start-ep-input').value || 1;

      const btn = document.getElementById('btn-export-selected');
      btn.disabled = true;
      btn.innerText = '⏳ Đang kéo ' + selectedPaths.length + ' tập vào bộ [' + title + ']...';
      showToast('');

      try {
        const res = await fetch('/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dramaTitle: title,
            startEpisode: startEp,
            selectedPaths,
            posterUrl: currentPosterUrl,
            force: (incompleteBoxes.length > 0)
          })
        });
        const data = await res.json();
        if (data.success) {
          if (data.skippedCount > 0) {
            showToast('✅ Đã xuất ' + data.count + ' tập mới (đã bỏ qua ' + data.skippedCount + ' tập đã có sẵn)!', 'success');
          } else {
            showToast('✅ Đã xuất thành công ' + data.count + ' tập vào bộ: ' + data.folder, 'success');
          }
          // Xóa các tập đã xuất khỏi danh sách đang chọn
          selectedPaths.forEach(sp => selectedCachePaths.delete(sp.path));
          updateSelectedExportBtn();
          delete document.getElementById('start-ep-input').dataset.manualEdited;
          lastRenderedSignature = '';
          loadStatus();
        } else {
          showToast('❌ Thất bại: ' + data.message, 'error');
        }
      } catch (e) {
        showToast('❌ Lỗi: ' + e.message, 'error');
      } finally {
        btn.disabled = false;
        updateSelectedExportBtn();
      }
    }

    async function deleteSelectedCache() {
      const checkboxes = document.querySelectorAll('.queue-checkbox:checked');
      if (checkboxes.length === 0) {
        alert('Vui lòng tích chọn các tập muốn xóa trong bộ nhớ đệm!');
        return;
      }

      if (confirm('Bạn có chắc muốn xóa ' + checkboxes.length + ' video đang chọn khỏi bộ nhớ tạm LDPlayer?')) {
        const paths = Array.from(checkboxes).map(b => b.value);
        await fetch('/api/delete-remote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths })
        });
        paths.forEach(p => selectedCachePaths.delete(p));
        updateSelectedExportBtn();
        showToast('🧹 Đã xóa các file tạm trên giả lập!', 'success');
        lastRenderedSignature = '';
        loadStatus();
      }
    }

    function renderLocalDramas(dramas) {
      const container = document.getElementById('dramas-container');
      if (dramas.length === 0) {
        container.innerHTML = '<div style="color: #64748b; font-size: 14px;">Chưa có bộ phim nào được xuất.</div>';
        return;
      }

      const currentSelectedTitle = document.getElementById('drama-title-input').value.trim();
      const safeSelected = currentSelectedTitle.replace(/[<>:"/\\|?*]/g, ' - ').replace(/\s+/g, ' ').trim().toLowerCase();

      container.innerHTML = dramas.map(d => {
        const isCurrentSelected = (isPinnedOldDrama && d.name.toLowerCase() === safeSelected);
        const borderStyle = isCurrentSelected ? 'border: 2px solid #38bdf8; box-shadow: 0 0 20px rgba(56, 189, 248, 0.25);' : '';
        const selectedTag = isCurrentSelected ? '<span class="drama-badge" style="background: #0284c7; color: #fff;">🎯 ĐANG ĐƯỢC CHỌN ĐỂ CẬP NHẬT</span>' : '';

        return `
        <div class="drama-section" style="${borderStyle}">
          <div class="drama-banner">
            <img src="/poster/${encodeURIComponent(d.name)}" alt="Poster" class="drama-poster-img" onerror="this.style.display='none'">
            <div class="drama-banner-info">
              <div class="drama-title">
                🎬 ${d.name}
                ${selectedTag}
              </div>
              <div class="drama-stats">
                <span class="drama-badge">📦 ${d.count} tập phim</span>
                <span class="drama-badge">💾 ${d.totalSizeMb || 0} MB</span>
                <span class="drama-badge" style="color: #38bdf8; font-weight: 700;">Tập kế tiếp: Tap_${String(d.nextEpisode).padStart(2, '0')}.mp4</span>
              </div>
              <div class="drama-actions">
                <button class="btn-update-drama" onclick="selectDramaForUpdate('${d.name.replace(/'/g, "\\\'")}')">
                  📥 Cập Nhật / Tải Tiếp Bộ Này (Từ Tập ${d.nextEpisode})
                </button>
                <button class="btn btn-secondary" onclick="openDramaFolder('${d.name.replace(/'/g, "\\\'")}')">
                  📂 Mở Thư Mục Bộ Phim
                </button>
                <a href="/poster/${encodeURIComponent(d.name)}" target="_blank" download="poster_${d.name}.png" class="btn btn-secondary" style="text-decoration: none;">
                  🖼️ Tải Ảnh Poster
                </a>
              </div>
            </div>
          </div>

          <div class="episodes-grid">
            ${d.videos.map(v => `
              <div class="ep-card">
                <div class="ep-thumb" onclick="playVideo('${v.relPath.replace(/'/g, "\\\'")}')">
                  <video src="/video/${encodeURI(v.relPath)}#t=0.5" preload="metadata" muted playsinline></video>
                  <div class="ep-thumb-overlay">
                    <span class="ep-thumb-icon">▶</span>
                  </div>
                </div>
                <div class="ep-body">
                  <div class="ep-name">${v.name}</div>
                  <div class="ep-meta">Dung lượng: ${v.sizeMb} MB</div>
                  <div class="ep-actions">
                    <button class="ep-btn ep-btn-play" onclick="playVideo('${v.relPath.replace(/'/g, "\\\'")}')">▶ Xem Full</button>
                    <button class="ep-btn ep-btn-copy" onclick="copyLink('${v.relPath.replace(/'/g, "\\\'")}')">📋 Copy</button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        `;
      }).join('');
    }

    async function openDramaFolder(name) {
      await fetch('/api/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: name })
      });
    }

    async function openCurrentDramaFolder() {
      const title = document.getElementById('drama-title-input').value.trim();
      openDramaFolder(title);
    }

    function playVideo(relPath) {
      currentPreviewContext = { localPath: relPath };
      document.getElementById('modal-title').innerText = relPath;
      const v = document.getElementById('player-video');
      const errBox = document.getElementById('player-error');
      if (errBox) errBox.style.display = 'none';

      v.onerror = () => {
        if (errBox) errBox.style.display = 'block';
      };

      v.src = '/video/' + encodeURI(relPath);
      document.getElementById('player-modal').style.display = 'flex';
      v.play().catch(() => {});
    }

    async function openInDesktopPlayer() {
      if (!currentPreviewContext) return;
      showToast('⏳ Đang mở video trên máy tính...', 'info');
      try {
        const res = await fetch('/api/open-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentPreviewContext)
        });
        const d = await res.json();
        if (d.success) {
          showToast('🎬 Đã mở video bằng trình phát ngoài!', 'success');
        } else {
          showToast('❌ Không thể mở: ' + d.message, 'error');
        }
      } catch (e) {
        showToast('❌ Lỗi: ' + e.message, 'error');
      }
    }

    function closeModal() {
      const modal = document.getElementById('player-modal');
      const v = document.getElementById('player-video');
      const errBox = document.getElementById('player-error');
      if (errBox) errBox.style.display = 'none';
      v.pause();
      v.src = '';
      currentPreviewContext = null;
      modal.style.display = 'none';
    }

    function copyLink(relPath) {
      const fullUrl = window.location.origin + '/video/' + encodeURI(relPath);
      navigator.clipboard.writeText(fullUrl).then(() => {
        alert('Đã copy đường link: ' + fullUrl);
      });
    }

    function showToast(msg, type) {
      const t = document.getElementById('toast-msg');
      if (!msg) { t.className = 'toast'; return; }
      t.innerText = msg;
      t.className = 'toast ' + type;
    }

    document.getElementById('drama-title-input').addEventListener('input', () => {
      delete document.getElementById('start-ep-input').dataset.manualEdited;
      updateEpisodeNumberHint();
      lastRenderedSignature = '';
      renderQueue(remoteCache);
    });
    document.getElementById('start-ep-input').addEventListener('input', (e) => {
      e.target.dataset.manualEdited = "true";
    });

    async function downloadSingleDirect(url, epNum) {
      const dramaTitle = (document.getElementById('drama-title-input') ? document.getElementById('drama-title-input').value.trim() : '') || 'Bo_Phim_Moi';
      showToast('⏳ Đang tải trực tiếp Tập ' + epNum + ' từ CDN siêu tốc...', 'info');
      try {
        const res = await fetch('/api/download-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, dramaTitle, epNumber: epNum })
        });
        const data = await res.json();
        if (data.success) {
          showToast('✅ Đã tải xong Tập ' + epNum + ' (' + (data.sizeBytes ? (data.sizeBytes / 1048576).toFixed(2) + ' MB' : '') + ')!', 'success');
          lastRenderedSignature = '';
          loadStatus();
        } else {
          showToast('❌ Tải thất bại: ' + data.message, 'error');
        }
      } catch (e) {
        showToast('❌ Lỗi: ' + e.message, 'error');
      }
    }

    let latestDirectEpisodes = [];

    async function openDirectLinksModal() {
      const modal = document.getElementById('direct-links-modal');
      const container = document.getElementById('direct-links-container');
      const titleEl = document.getElementById('direct-modal-title');
      container.innerHTML = '<div style="text-align: center; padding: 20px; color: #94a3b8;">⏳ Đang trích xuất toàn bộ link video từ CSDL của app...</div>';
      modal.style.display = 'flex';

      try {
        const res = await fetch('/api/direct-episodes');
        const data = await res.json();
        if (data.success && data.episodes && data.episodes.length > 0) {
          latestDirectEpisodes = data.episodes;
          titleEl.innerText = '⚡ Toàn Bộ Link CDN: ' + (data.title || 'Bộ Phim') + ' (' + data.episodes.length + ' tập)';

          container.innerHTML = data.episodes.map(ep => {
            return `
            <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 800; color: #38bdf8; font-size: 14px;">Tập ${ep.epNumber}</span>
                ${ep.isVip ? '<span style="font-size: 10px; background: #eab308; color: #000; font-weight: 700; padding: 1px 6px; border-radius: 4px;">VIP</span>' : ''}
              </div>
              <div style="display: flex; gap: 8px; align-items: center;">
                <button type="button" class="btn btn-secondary" style="font-size: 11px; padding: 4px 8px; color: #a78bfa;" onclick="copyDirectUrl('${ep.directUrl.replace(/'/g, "\\\'")}')">
                  📋 Copy Link
                </button>
                <a href="${ep.directUrl}" target="_blank" class="btn btn-secondary" style="font-size: 11px; padding: 4px 8px; text-decoration: none; color: #38bdf8; border: 1px solid rgba(56,189,248,0.4);" title="Mở xem trực tiếp trên tab mới của trình duyệt">
                  🌐 Mở Xem
                </a>
                <button type="button" class="btn btn-primary" style="font-size: 11px; padding: 4px 10px; background: #10b981; border: none; font-weight: 700;" onclick="downloadSingleDirect('${ep.directUrl.replace(/'/g, "\\\'")}', ${ep.epNumber})">
                  ⚡ Tải (1s)
                </button>
              </div>
            </div>
            `;
          }).join('');
        } else {
          container.innerHTML = '<div style="text-align: center; padding: 20px; color: #f87171;">⚠️ Chưa tìm thấy dữ liệu tập của bộ phim trong app! Hãy mở phim trên app giả lập trước.</div>';
        }
      } catch (e) {
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #f87171;">❌ Lỗi: ' + e.message + '</div>';
      }
    }

    function closeDirectLinksModal() {
      document.getElementById('direct-links-modal').style.display = 'none';
    }

    function copyDirectUrl(url) {
      navigator.clipboard.writeText(url).then(() => {
        showToast('📋 Đã copy link CDN video vào bộ nhớ tạm!', 'success');
      });
    }

    async function downloadAllDirect() {
      if (latestDirectEpisodes.length === 0) return;
      const dramaTitle = (document.getElementById('drama-title-input') ? document.getElementById('drama-title-input').value.trim() : '') || 'Bo_Phim_Moi';
      if (!confirm('Bạn có muốn tải tự động TẤT CẢ ' + latestDirectEpisodes.length + ' tập trực tiếp từ CDN về máy? (Khoảng 1-2 giây / tập)')) {
        return;
      }

      const btn = document.getElementById('btn-batch-download-direct');
      const statusEl = document.getElementById('direct-batch-status');
      btn.disabled = true;

      for (let i = 0; i < latestDirectEpisodes.length; i++) {
        const ep = latestDirectEpisodes[i];
        statusEl.innerText = `⏳ Đang tải Tập ${ep.epNumber}/${latestDirectEpisodes.length}...`;
        try {
          await fetch('/api/download-direct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: ep.directUrl, dramaTitle, epNumber: ep.epNumber })
          });
        } catch (e) {}
      }

      statusEl.innerText = `✅ Đã tải xong toàn bộ ${latestDirectEpisodes.length} tập!`;
      btn.disabled = false;
      lastRenderedSignature = '';
      loadStatus();
      showToast('🎉 Đã tải hoàn tất cả bộ phim từ link trực tiếp!', 'success');
    }

    loadStatus();
    setInterval(loadStatus, 4000);