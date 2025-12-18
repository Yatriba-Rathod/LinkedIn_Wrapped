// Wait for html2canvas to load
function waitForHtml2Canvas() {
    return new Promise((resolve) => {
        if (window.html2canvas) {
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (window.html2canvas) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        }
    });
}

// Wait for the export button to be available in the DOM
function waitForExportButton() {
    return new Promise((resolve) => {
        const btn = document.getElementById('exportAll');
        if (btn) {
            resolve(btn);
        } else {
            const checkInterval = setInterval(() => {
                const btn = document.getElementById('exportAll');
                if (btn) {
                    clearInterval(checkInterval);
                    resolve(btn);
                }
            }, 50);
        }
    });
}

// Initialize when button is ready
(async function () {
    const exportBtn = await waitForExportButton();
    console.log('[report-script] Export button found, attaching listener');

    exportBtn.addEventListener('click', async () => {
        try {
            await waitForHtml2Canvas();

            const container = document.querySelector('.container');
            const btn = document.getElementById('exportAll');
            btn.textContent = '⏳ Generating...';
            btn.disabled = true;

            // Hide the export button temporarily
            const actionsDiv = document.querySelector('.actions');
            actionsDiv.style.display = 'none';

            // Disable all animations and transitions for capture
            const styleEl = document.createElement('style');
            styleEl.id = 'disable-animations';
            styleEl.textContent = `
                * {
                    animation: none !important;
                    transition: none !important;
                    animation-delay: 0s !important;
                }
            `;
            document.head.appendChild(styleEl);

            // Wait for animations to stop and content to settle
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log('[report-script] Animations disabled, starting capture...');

            // Capture the entire container (header + cards)
            const canvas = await html2canvas(container, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: null,
                logging: false,
                windowWidth: container.scrollWidth,
                windowHeight: container.scrollHeight
            });

            console.log('[report-script] Capture complete, canvas size:', canvas.width, 'x', canvas.height);

            // Show the button again and re-enable animations
            actionsDiv.style.display = 'block';
            const disableAnimStyle = document.getElementById('disable-animations');
            if (disableAnimStyle) {
                disableAnimStyle.remove();
            }

            // Create final canvas with gradient background
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = canvas.width;
            finalCanvas.height = canvas.height;
            const ctx = finalCanvas.getContext('2d');

            // Fill with gradient background
            const gradient = ctx.createLinearGradient(0, 0, 0, finalCanvas.height);
            gradient.addColorStop(0, '#1DB954');
            gradient.addColorStop(0.5, '#0A66C2');
            gradient.addColorStop(1, '#000000');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

            // Draw the captured content on top
            ctx.drawImage(canvas, 0, 0);

            // Download the image
            const url = finalCanvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = 'linkedin_wrapped_2025.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            btn.textContent = 'Downloaded!';
            setTimeout(() => {
                btn.textContent = '📸 Export as Image';
                btn.disabled = false;
            }, 2000);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please try again.');
            const actionsDiv = document.querySelector('.actions');
            actionsDiv.style.display = 'block';
            // Re-enable animations on error
            const disableAnimStyle = document.getElementById('disable-animations');
            if (disableAnimStyle) {
                disableAnimStyle.remove();
            }
            document.getElementById('exportAll').textContent = '📸 Export as Image';
            document.getElementById('exportAll').disabled = false;
        }
    });
})();
