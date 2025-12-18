// This script renders the report by reading data from chrome.storage
(async function () {
    try {
        console.log('[report-renderer] Starting...');

        // Get report data from storage
        const result = await chrome.storage.local.get(['reportData', 'iconDataURL']);

        console.log('[report-renderer] Storage result:', result);

        if (!result.reportData) {
            const container = document.querySelector('.container');
            if (container) {
                container.innerHTML = '<div class="loading">No report data found. Please generate a report first.</div>';
            }
            return;
        }

        // Import the template module
        const mod = await import('./report.js');

        console.log('[report-renderer] Module imported');

        // Generate HTML
        const html = mod.createReportHtml(result.reportData, result.iconDataURL);

        console.log('[report-renderer] HTML generated, length:', html.length);

        // Parse the HTML and extract the body content
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Extract styles
        const styles = doc.querySelector('style');
        if (styles) {
            document.head.appendChild(styles);
        }

        // Extract the container content (not the entire body)
        const generatedContainer = doc.querySelector('.container');
        if (generatedContainer) {
            // Replace the current container with the generated one
            const currentContainer = document.querySelector('.container');
            if (currentContainer) {
                currentContainer.replaceWith(generatedContainer);
            } else {
                document.body.appendChild(generatedContainer);
            }
        }

        console.log('[report-renderer] Content injected');

        // Load html2canvas
        const html2canvasScript = document.createElement('script');
        html2canvasScript.src = 'html2canvas.min.js';
        document.body.appendChild(html2canvasScript);

        html2canvasScript.onload = () => {
            console.log('[report-renderer] html2canvas loaded');
            const reportScript = document.createElement('script');
            reportScript.src = 'report-script.js';
            document.body.appendChild(reportScript);
        };

        html2canvasScript.onerror = (error) => {
            console.error('[report-renderer] Failed to load html2canvas:', error);
        };

    } catch (error) {
        console.error('[report-renderer] Error:', error);
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = '<div class="loading">Error loading report: ' + error.message + '</div>';
        }
    }
})();
