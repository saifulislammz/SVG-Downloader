document.addEventListener('DOMContentLoaded', async function() {
  const gallery = document.getElementById('svgGallery');
  const searchInput = document.getElementById('searchInput');
  const totalCount = document.getElementById('totalCount');
  const modal = document.getElementById('previewModal');
  const closeModal = document.querySelector('.close-modal');
  const modalDownloadBtn = document.getElementById('modalDownloadBtn');
  let currentSvgData = null;
  let svgElements = [];

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // First ensure content script is injected
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  } catch (error) {
    console.log('Content script already loaded or cannot be injected');
  }

  // Then request SVGs from the content script
  try {
    const response = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { action: "getSVGs" }, resolve);
    });

    if (response && response.svgs.length > 0) {
      svgElements = response.svgs;
      totalCount.textContent = `${svgElements.length} SVGs found`;
      renderGallery(svgElements);
    } else {
      gallery.innerHTML = `
        <div class="empty-state">
          <i class="material-icons">image_not_supported</i>
          <p>No SVG elements found on this page</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error:', error);
    gallery.innerHTML = `
      <div class="empty-state">
        <i class="material-icons">error_outline</i>
        <p>Could not scan this page for SVGs</p>
      </div>
    `;
  }

  function renderGallery(svgs) {
    gallery.innerHTML = '';
    svgs.forEach((svgData, index) => {
      const card = document.createElement('div');
      card.className = 'svg-card';
      card.innerHTML = `
        <div class="svg-preview">
          ${svgData}
        </div>
        <div class="card-actions">
          <button class="btn preview-btn" data-index="${index}">
            <i class="material-icons">visibility</i>
            Preview
          </button>
          <button class="btn download-btn" data-index="${index}">
            <i class="material-icons">download</i>
            Download
          </button>
        </div>
      `;
      gallery.appendChild(card);
    });
  }

  // Event Listeners
  gallery.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;

    const index = button.dataset.index;
    if (button.classList.contains('preview-btn')) {
      showPreview(svgElements[index]);
    } else if (button.classList.contains('download-btn')) {
      downloadSVG(svgElements[index]);
    }
  });

  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredSVGs = svgElements.filter(svg => 
      svg.toLowerCase().includes(searchTerm)
    );
    renderGallery(filteredSVGs);
  });

  closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
    currentSvgData = null;
  });

  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
      currentSvgData = null;
    }
  });

  // Add zoom functionality
  let currentZoom = 1;
  const zoomIn = document.getElementById('zoomIn');
  const zoomOut = document.getElementById('zoomOut');
  const resetZoom = document.getElementById('resetZoom');
  const previewSize = document.getElementById('previewSize');
  const svgInfo = document.getElementById('svgInfo');

  function updateZoom() {
    const svg = document.querySelector('#previewContent svg');
    if (svg) {
      svg.style.transform = `scale(${currentZoom})`;
      previewSize.textContent = `${Math.round(currentZoom * 100)}%`;
    }
  }

  zoomIn.addEventListener('click', () => {
    currentZoom = Math.min(currentZoom + 0.1, 3);
    updateZoom();
  });

  zoomOut.addEventListener('click', () => {
    currentZoom = Math.max(currentZoom - 0.1, 0.1);
    updateZoom();
  });

  resetZoom.addEventListener('click', () => {
    currentZoom = 1;
    updateZoom();
  });

  function showPreview(svgData) {
    const previewContent = document.getElementById('previewContent');
    previewContent.innerHTML = svgData;
    currentSvgData = svgData;
    
    // Reset zoom when showing new preview
    currentZoom = 1;
    updateZoom();
    
    // Show SVG dimensions
    const svg = previewContent.querySelector('svg');
    if (svg) {
      const width = svg.getAttribute('width') || 'auto';
      const height = svg.getAttribute('height') || 'auto';
      svgInfo.textContent = `Dimensions: ${width} × ${height}`;
    }
    
    modal.style.display = 'block';
  }

  // Update the SVG preview size based on its content
  function updatePreviewSize() {
    const svg = document.querySelector('#previewContent svg');
    if (svg) {
      const viewBox = svg.getAttribute('viewBox');
      const width = svg.getAttribute('width');
      const height = svg.getAttribute('height');
      
      if (!width && !height && viewBox) {
        const [, , vWidth, vHeight] = viewBox.split(' ').map(Number);
        const ratio = vWidth / vHeight;
        
        if (ratio > 1) {
          svg.style.width = '100%';
          svg.style.height = 'auto';
        } else {
          svg.style.height = '100%';
          svg.style.width = 'auto';
        }
      }
    }
  }

  // Call this when showing preview
  const observer = new ResizeObserver(() => {
    updatePreviewSize();
  });

  // Observe the preview content for size changes
  observer.observe(document.getElementById('previewContent'));

  modalDownloadBtn.addEventListener('click', () => {
    if (currentSvgData) {
      downloadSVG(currentSvgData);
    }
  });

  function downloadSVG(svgData) {
    if (!svgData.includes('xmlns')) {
      svgData = svgData.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!svgData.includes('<?xml')) {
      svgData = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgData;
    }

    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `svg_${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Notification System
  document.addEventListener('DOMContentLoaded', function() {
    const promoNotification = document.getElementById('promoNotification');
    const notificationPopup = document.getElementById('notificationPopup');
    const closeNotification = document.getElementById('closeNotification');
    const closePromo = document.getElementById('closePromo');

    // Show notification popup when clicking the notification icon
    promoNotification.addEventListener('click', function() {
      notificationPopup.style.display = 'block';
    });

    // Close notification popup
    closeNotification.addEventListener('click', function() {
      notificationPopup.style.display = 'none';
    });

    // Close promotional banner
    closePromo.addEventListener('click', function() {
      document.querySelector('.promo-banner').style.display = 'none';
      // Optionally save to localStorage to remember user's preference
      localStorage.setItem('promoBannerClosed', 'true');
    });

    // Check if promo banner was previously closed
    if (localStorage.getItem('promoBannerClosed') === 'true') {
      document.querySelector('.promo-banner').style.display = 'none';
    }

    // Auto show notification after 5 seconds (optional)
    setTimeout(() => {
      if (!localStorage.getItem('notificationShown')) {
        notificationPopup.style.display = 'block';
        localStorage.setItem('notificationShown', 'true');
      }
    }, 5000);
  });
}); 