(function() {
  // Check if script is already injected
  if (window.svgFinderLoaded) return;
  window.svgFinderLoaded = true;

  // Private state
  const _state = {
    selectionMode: false,
    highlightedElement: null
  };

  // Function to find all SVG elements on the page
  function findAllSVGElements() {
    const svgElements = Array.from(document.querySelectorAll('svg'));
    return svgElements.filter(svg => {
      const box = svg.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    });
  }

  // Function to serialize an SVG element to a string
  function serializeSVGElement(element) {
    try {
      const clone = element.cloneNode(true);
      if (!clone.hasAttribute('xmlns')) {
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      }
      if (!clone.hasAttribute('viewBox') && 
          clone.hasAttribute('width') && 
          clone.hasAttribute('height')) {
        clone.setAttribute('viewBox', `0 0 ${clone.getAttribute('width')} ${clone.getAttribute('height')}`);
      }
      return new XMLSerializer().serializeToString(clone);
    } catch (error) {
      console.error('Error serializing SVG:', error);
      return null;
    }
  }

  // Function to download SVG
  function downloadSVG(svgData) {
    if (!svgData) return;
    
    try {
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `icon_${Date.now()}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading SVG:', error);
    }
  }

  // Listen for messages from the popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case "getSVGs":
        const svgs = findAllSVGElements()
          .map(serializeSVGElement)
          .filter(Boolean);
        sendResponse({ svgs });
        break;

      case "downloadSVG":
        if (request.svgData) {
          downloadSVG(request.svgData);
          sendResponse({ success: true });
        }
        break;

      default:
        sendResponse({ error: "Unknown action" });
    }
    return true;
  });

  // Initialize
  function initialize() {
    if (_state.highlightedElement) {
      _state.highlightedElement.style.outline = '';
    }
    _state.selectionMode = false;
    _state.highlightedElement = null;
  }

  // Run initialization
  initialize();
})();